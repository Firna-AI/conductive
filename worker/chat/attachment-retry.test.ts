import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { ProviderError } from '../sandbox/errors'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  attachmentFixture,
  ATTACHMENT_IGNORE_BYTES,
  FILE_BYTES,
} from './attachment.test-support'
import { prepareMessageAttachments } from './attachment-copy'
import { providerCopy } from './attachment-copy.test-support'
import { attachmentNotFound } from './attachment-record'
import {
  AttachmentTransferFailed,
  warnAttachmentCopyFailed,
} from './attachment-transfer-failure'
import { latestAttachmentFailure } from './attachment-transfer.test-support'
import { selectAttachmentComputer } from './attachment-owner.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

const UNANSWERED = {
  kind: 'provider',
  providerKind: 'unavailable',
  status: 503,
  code: null,
}

/**
 * The provider runs each download command, but its answer to the first
 * `lost` starts is a server error, as when its answer comes too late.
 */
async function lostStarts(lost: number) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const provider = providerCopy(harness.env)
  let remaining = lost
  let starts = 0
  const fetch = async (request: Request) => {
    const start =
      request.method === 'POST' &&
      new URL(request.url).pathname.endsWith('/commands')
    if (start) starts += 1
    const response = await provider.fetch(request)
    if (!start || remaining === 0) return response
    remaining -= 1
    return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
  }
  const fixture = await attachmentFixture(harness, {
    prepareAttachments: (...args) =>
      prepareMessageAttachments(harness.env, ...args, fetch),
  })
  await selectAttachmentComputer(harness, 'sandbox-retry')
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(
    (await fixture.sendAttachment(session.id, 'retried-file', [file.id]))
      .status,
  ).toBe(202)
  await fixture.drainAttachments()
  /** The chat code runs in the local Workers runtime, so only copy logs show here. */
  const warnings = () =>
    warn.mock.calls
      .map(([fields]: unknown[]) => fields)
      .filter(
        (fields) =>
          typeof fields === 'object' &&
          fields !== null &&
          'kind' in fields &&
          String(fields.kind).startsWith('attachment_'),
      )
  return { provider, fixture, runner, warnings, starts: () => starts }
}

it('downloads again with a new token when the provider runs the first download but does not answer its start', async () => {
  const { provider, fixture, runner, warnings } = await lostStarts(1)
  try {
    expect(provider.copies).toEqual([
      ATTACHMENT_IGNORE_BYTES,
      FILE_BYTES,
      ATTACHMENT_IGNORE_BYTES,
      FILE_BYTES,
    ])
    expect(messageCommands(runner, 'retried-file')).toHaveLength(1)
    expect(await latestAttachmentFailure(fixture)).toBeUndefined()
    expect(warnings()).toEqual([
      expect.objectContaining({
        kind: 'attachment_transfer_retried',
        step: 'start',
        error: UNANSWERED,
      }),
    ])
  } finally {
    runner.disconnect()
  }
})

it('fails the turn with the unanswered text after the provider does not answer the start twice', async () => {
  const { fixture, runner, warnings, starts } = await lostStarts(2)
  try {
    expect(starts()).toBe(2)
    expect(messageCommands(runner, 'retried-file')).toEqual([])
    expect((await latestAttachmentFailure(fixture))?.error).toEqual({
      code: 'attachment_copy_failed',
      message:
        'The cloud computer did not answer, so the attached files did not arrive. Try again.',
    })
    expect(warnings()).toEqual([
      expect.objectContaining({
        kind: 'attachment_transfer_retried',
        step: 'start',
        error: UNANSWERED,
      }),
    ])
  } finally {
    runner.disconnect()
  }
})

it('logs the step and the provider cause of a failed copy, and a summary of any other error', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  warnAttachmentCopyFailed(
    'workspace',
    new AttachmentTransferFailed(
      'status',
      new ProviderError('unavailable', 503),
    ),
  )
  warnAttachmentCopyFailed('workspace', attachmentNotFound())
  expect(warn.mock.calls.map(([fields]: unknown[]) => fields)).toEqual([
    expect.objectContaining({
      kind: 'attachment_copy_failed',
      step: 'status',
      error: UNANSWERED,
    }),
    expect.objectContaining({
      kind: 'attachment_copy_failed',
      step: null,
      error: { kind: 'http', status: 404, code: 'attachment_not_found' },
    }),
  ])
})
