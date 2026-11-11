import { expect } from 'vitest'

import {
  workspacePaths,
  type ActivateWorkspaceResponse,
} from '../../src/shared/workspaces'
import type {
  RunnerImportCommand,
  RunnerImportResult,
} from '../../src/shared/runner-import'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { importFixture } from '../conductor-import/service.test-support'
import { importReader } from '../conductor-import/member.test-support'
import { seedBackendLogin } from './backend-seed.test-support'
import { seedPublishedImage } from './published-image-test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { readWorkspaceToken } from './tokens'
import { readStartJob, type StoredWorkspaceStartJob } from './start-job-codec'
import { START_JOB_KEY } from './start-storage'
import type { WorkspaceToRunner } from '../../src/shared/runner'
import type { WorkspaceSocketMessage } from '../../src/shared/events'
import { providerCopy } from '../chat/attachment-copy.test-support'
import {
  SNAPSHOT,
  ENTRIES,
  PARTS,
} from '../conductor-import/manifest.test-support'
import { partFor } from '../conductor-import/storage.test-support'

export async function activationFixture(
  harness: TestHarness,
  largeCode = false,
) {
  const fixture = await importFixture(harness)
  if (largeCode) {
    const bytes = new Uint8Array(1_000_000).fill(65)
    const part = partFor(bytes, 'code')
    await fixture.control({
      kind: 'reserve',
      row: { ...fixture.source, uploadBytes: 1_000_025 },
    })
    await fixture.control({
      kind: 'snapshot',
      reservationId: 'reservation',
      snapshot: {
        ...SNAPSHOT,
        storedBytes: 1_000_025,
        restoredBytes: 1_000_025,
      },
    })
    await fixture.control({
      kind: 'manifest',
      reservationId: 'reservation',
      offset: 0,
      entries: ENTRIES.map((entry) => {
        if (entry.kind === 'object' && entry.id === 'code')
          return { ...entry, sizeBytes: 1_000_000, restoredBytes: 1_000_000 }
        if (entry.kind === 'part' && entry.part.id === 'code')
          return { ...entry, part }
        return entry
      }),
    })
    await fixture.control({
      kind: 'manifest.end',
      reservationId: 'reservation',
    })
    for (const stored of PARTS) {
      await fixture.upload(
        stored.id,
        fixture.service,
        'reservation',
        stored.id === 'code' ? bytes : undefined,
      )
      await fixture.control({
        kind: 'verify',
        reservationId: 'reservation',
        partId: stored.id,
      })
    }
  } else {
    await fixture.prepare()
    await fixture.verifyAll()
  }
  await fixture.control({ kind: 'complete', reservationId: 'reservation' })
  const reader = await importReader(fixture)
  await seedBackendLogin(harness, 'document-reader')
  const models = JSON.stringify([
    {
      agent: 'codex',
      model: 'test-model',
      label: 'Test Codex',
      efforts: ['high'],
    },
    {
      agent: 'claude',
      model: 'test-claude',
      label: 'Test Claude',
      efforts: ['high'],
    },
  ])
  const environment = {
    CONDUCTIVE_RUNNER_ARCHIVE_URL: SOFTWARE.url,
    CONDUCTIVE_RUNNER_ARCHIVE_SHA256: SOFTWARE.sha256,
    CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({
      agent: 'codex',
      model: 'test-model',
      effort: 'high',
    }),
    CONDUCTIVE_MODELS: models,
  }
  Object.assign(fixture.env, environment)
  await seedPublishedImage(fixture.db, {
    orgId: fixture.org.id,
    buildId: 'activation-image',
    imageName: 'older-good-image',
    repositories: [
      {
        id: 'import-repo',
        orgId: fixture.org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME - 1,
    runnerProtocolVersion: 1,
  })
  await fixture.db
    .prepare(
      "UPDATE settings SET startup_script = 'echo restored-startup' WHERE org_id = ?",
    )
    .bind(fixture.org.id)
    .run()
  const boat = new LifecycleBoat()
  const attachments = providerCopy()
  harness.setNativeFetch((request) => {
    const url = new URL(request.url)
    if (
      url.hostname === 'attachment-transfer.test' ||
      url.pathname.endsWith('/files/upload-url')
    )
      return attachments.fetch(request)
    return url.hostname === 'boat.dev'
      ? boat.fetch(request)
      : harness.github.fetch(request)
  })
  const actor = harness.native.actor('reservation', { environment })
  await actor.ready
  let now = TEST_TIME
  let stream = 0
  let connection = ''
  const received: (WorkspaceToRunner | WorkspaceSocketMessage)[] = []
  const preparations: { phase: string; prepared: boolean; copies: number }[] =
    []
  const take = async () => {
    const peer = await actor.api.peers.take(connection)
    received.push(...peer.messages)
    return peer.messages
  }
  const readJob = async () => {
    const stored =
      await actor.api.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
    return stored ? readStartJob(stored) : undefined
  }
  const tick = async () => {
    await fixture.setTime(++now)
    await actor.api.controls.dispatchAlarm()
  }
  const commands = async () =>
    (await take()).filter(
      (message): message is RunnerImportCommand =>
        message.type === 'import.command',
    )
  const acknowledge = async (
    command: RunnerImportCommand,
    result: RunnerImportResult = command.action.kind === 'session'
      ? { ok: true, preparation: 'prepared' }
      : { ok: true },
  ) => {
    await actor.api.peers.receiveRunner(connection, {
      ...command,
      type: 'import.result',
      action: undefined,
      result,
    })
  }
  return {
    ...fixture,
    actor,
    reader,
    boat,
    readJob,
    tick,
    commands,
    acknowledge,
    received,
    take,
    attachments,
    preparations,
    activate: async (cookie = reader) => {
      const response = await fixture.request(
        workspacePaths.activate(fixture.org.id, 'reservation'),
        'POST',
        {},
        cookie,
      )
      expect(response.status).toBe(200)
      const value: ActivateWorkspaceResponse = await response.json()
      return value
    },
    connect: async () => {
      connection = `runner-${++stream}`
      await actor.api.peers.connectRunner(connection, {
        url: fixture.env.MACHINE_ORIGIN + MACHINE_PATHS.runner,
        headers: {
          Authorization: `Bearer ${await readWorkspaceToken(fixture.env, 'reservation')}`,
        },
      })
      await actor.api.peers.receiveRunner(connection, {
        type: 'hello',
        protocolVersion: 2,
        workspaceId: 'reservation',
        streamId: connection,
      })
      await actor.api.peers.receiveRunner(connection, {
        type: 'event',
        streamId: connection,
        eventNumber: 1,
        occurredAt: now,
        event: { type: 'runner.ready' },
      })
      await take()
    },
    peer: () => connection,
    chatRequest: (path: string, body: unknown) =>
      actor.fetch(
        new Request(fixture.env.APP_ORIGIN + path, {
          method: 'POST',
          headers: {
            Origin: fixture.env.APP_ORIGIN,
            Cookie: reader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
      ),
    advanceToTransport: async () => {
      for (let step = 0; step < 12; step++) {
        if ((await readJob())?.phase === 'import-open') break
        await tick()
      }
      expect((await readJob())?.phase).toBe('import-open')
    },
    finish: async () => {
      for (let step = 0; step < 150 && (await readJob()); step++) {
        await tick()
        preparations.push({
          phase: (await readJob())?.phase ?? 'complete',
          prepared:
            (await actor.lifecycle.readLifecycle())?.startupPrepared === true,
          copies: attachments.paths.length,
        })
        for (const command of await commands()) await acknowledge(command)
      }
      expect(await readJob()).toBeUndefined()
      await actor.api.controls.drainBackground()
      await actor.api.controls.settled()
    },
  }
}
