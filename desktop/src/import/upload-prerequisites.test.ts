import { expect, it } from 'vitest'
import type {
  ImportDeviceFrame,
  ImportRepositoryFacts,
} from '../../../src/shared/conductor-import-operation.ts'
import { importEncodedBytes } from '../../../src/shared/conductor-import-pages.ts'
import { uploadStageFixture } from '../../tests/import-upload.ts'
import { createImportChannel } from './channel.ts'
import { controllerFixture } from './controller.test-support.ts'
import { proveImportPrerequisites } from './upload-prerequisites.ts'

it('pages a large prerequisite graph and retains the receipt of each proved root', async () => {
  const fixture = controllerFixture()
  const { stage } = uploadStageFixture()
  const candidates = Array.from({ length: 27_000 }, (_, index) =>
    (index + 1).toString(16).padStart(40, '0'),
  )
  const missing = candidates[1]
  const facts: ImportRepositoryFacts = {
    id: 'facts-one',
    repositoryId: 1,
    fullName: 'firna/repository',
    branch: 'feature',
    branchHeadOid: null,
    defaultBranch: 'main',
    defaultHeadOid: 'f'.repeat(40),
    observedAt: 0,
  }
  const frames: ImportDeviceFrame[] = []
  const abort = new AbortController()
  const channel = createImportChannel(
    'proof-one',
    (message) => {
      if (
        message.type !== 'import.frame' ||
        message.event.kind !== 'repository.prerequisites'
      )
        throw new Error('Unexpected proof control')
      const event = message.event
      const page = frames.length
      frames.push(message)
      queueMicrotask(() =>
        channel.receive({
          type: 'import.ack',
          operationId: message.operationId,
          sequence: message.sequence,
          result: {
            kind: 'repository.prerequisites',
            receiptId: `receipt-${page}`,
            verified: event.candidates
              .filter((oid) => oid !== missing)
              .map((oid) => ({ oid, headOid: 'f'.repeat(40) })),
            missing: event.candidates.filter((oid) => oid === missing),
          },
        }),
      )
      return true
    },
    abort,
  )
  const result = await proveImportPrerequisites(
    { ...stage, candidates },
    'reservation-one',
    facts,
    {
      jobs: fixture.jobs,
      channel,
      signal: abort.signal,
      scope: 'scope',
      orgId: 'org-one',
      operationId: 'proof-one',
      put: async () => 200,
      now: () => 0,
    },
  )
  expect(frames.length).toBeGreaterThan(1)
  expect(result).toHaveLength(26_999)
  expect(result[0]).toEqual({
    kind: 'prerequisite',
    oid: '0'.repeat(39) + '1',
    receiptId: 'receipt-0',
  })
  expect(result.some((entry) => entry.oid === missing)).toBe(false)
  expect(new Set(result.map((entry) => entry.receiptId)).size).toBeGreaterThan(
    1,
  )
  for (const frame of frames) {
    expect(importEncodedBytes(frame)).toBeLessThan(1_000_000)
    expect(frame.event).toMatchObject({
      sourceFingerprint: stage.snapshot.sourceFingerprint,
      headOid: stage.snapshot.headOid,
    })
  }
  expect(
    frames.flatMap((frame) =>
      frame.event.kind === 'repository.prerequisites'
        ? frame.event.candidates
        : [],
    ),
  ).toEqual(candidates)
  fixture.controller.dispose()
})
