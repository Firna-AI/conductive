import { describe, expect, test, vi } from 'vitest'
import {
  ATTACHMENT_PART_BYTES,
  type AttachmentUploadTarget,
} from '../shared/messages'
import { deferred } from '../test-support/mount'
import type { FileReply } from './api/client'
import {
  receipt,
  refusal,
  run,
  upload,
  uploaded,
  worker,
} from './attachment-upload.test-support'

describe('uploadAttachment', () => {
  test('starts with the size, sends each slice of the file in its order, counts the bytes of all parts, and completes with every receipt', async () => {
    const setup = worker()
    const { result, progress, kept } = await run(setup)
    expect({
      result,
      calls: setup.calls,
      bodies: setup.bodies,
      progress,
      kept: kept.map((item) => item?.receipts.length),
    }).toEqual({
      result: uploaded,
      calls: [
        'start',
        'part 1: 0123',
        'part 2: 4567',
        'part 3: 89',
        'complete',
      ],
      bodies: [
        { name: 'notes.txt', mediaType: 'text/plain', sizeBytes: 10 },
        { parts: [receipt(1), receipt(2), receipt(3)] },
      ],
      progress: [2, 4, 6, 8, 9, 10],
      kept: [0, 1, 2, 3],
    })
  })

  test('sends a part that got no answer, a server error, or a broken body again alone, up to three times', async () => {
    const again = worker({
      parts: {
        2: [
          'offline',
          refusal(503, 'attachment_upload_failed'),
          refusal(400, 'attachment_upload_interrupted'),
        ],
      },
    })
    const recovered = await run(again)
    const spent = worker({
      parts: {
        2: ['offline', 'offline', 'offline', { status: 502, body: null }],
      },
    })
    const failed = await run(spent)
    expect({
      recovered: recovered.result,
      sends: again.calls,
      failed: failed.result,
      spent: spent.calls,
      kept: failed.last,
    }).toMatchObject({
      recovered: uploaded,
      sends: [
        'start',
        'part 1: 0123',
        'part 2: 4567',
        'part 2: 4567',
        'part 2: 4567',
        'part 2: 4567',
        'part 3: 89',
        'complete',
      ],
      failed: { status: 502, code: 'http_error' },
      spent: [
        'start',
        'part 1: 0123',
        'part 2: 4567',
        'part 2: 4567',
        'part 2: 4567',
        'part 2: 4567',
      ],
      kept: upload([1]),
    })
  })

  test('sends a refused part only once and keeps the upload for Try again', async () => {
    const setup = worker({ parts: { 2: [refusal(409, 'workspace_archived')] } })
    const { result, last } = await run(setup)
    expect({ result, calls: setup.calls, last }).toMatchObject({
      result: { status: 409, code: 'workspace_archived' },
      calls: ['start', 'part 1: 0123', 'part 2: 4567'],
      last: upload([1]),
    })
  })

  test('resumes a kept upload with only the parts that have no receipt', async () => {
    const setup = worker()
    const { result, progress } = await run(setup, { resume: upload([1]) })
    expect({
      result,
      calls: setup.calls,
      complete: setup.bodies,
      progress,
    }).toEqual({
      result: uploaded,
      calls: ['part 2: 4567', 'part 3: 89', 'complete'],
      complete: [{ parts: [receipt(1), receipt(2), receipt(3)] }],
      progress: [6, 8, 9, 10],
    })
  })

  test('starts a new upload when the Worker no longer has the kept one', async () => {
    const setup = worker({
      parts: { 2: [refusal(404, 'attachment_not_found')] },
    })
    const { result, kept } = await run(setup, { resume: upload([1]) })
    expect({
      result,
      calls: setup.calls,
      kept: kept.map((item) => item?.receipts.length ?? null),
    }).toEqual({
      result: uploaded,
      calls: [
        'part 2: 4567',
        'start',
        'part 1: 0123',
        'part 2: 4567',
        'part 3: 89',
        'complete',
      ],
      kept: [1, null, 0, 1, 2, 3],
    })
  })

  test('drops the upload when its complete call ends it, and keeps it when no answer came', async () => {
    const ended = await run(
      worker({
        complete: () =>
          Response.json(
            {
              error: {
                code: 'attachment_upload_failed',
                message: 'The file upload did not finish. Try again.',
              },
            },
            { status: 503 },
          ),
      }),
    )
    const lost = await run(
      worker({
        complete: () => {
          throw new Error('offline')
        },
      }),
    )
    expect({
      ended: ended.result,
      endedKept: ended.last,
      lost: lost.result,
      lostKept: lost.last,
    }).toMatchObject({
      ended: { status: 503, code: 'attachment_upload_failed' },
      endedKept: null,
      lost: { status: 0, code: 'network' },
      lostKept: upload([1, 2, 3]),
    })
  })

  test('starts a draft file with its message, and an empty file with one empty part', async () => {
    const draft: AttachmentUploadTarget = {
      type: 'new-workspace',
      messageId: 'message-1',
    }
    const setup = worker({
      target: draft,
      start: { partSizeBytes: ATTACHMENT_PART_BYTES, partCount: 1 },
    })
    const empty = new File([], 'empty.txt', { type: 'text/plain' })
    const { result } = await run(setup, { file: empty })
    expect({ result, calls: setup.calls, start: setup.bodies[0] }).toEqual({
      result: uploaded,
      calls: ['start', 'part 1: ', 'complete'],
      start: {
        name: 'empty.txt',
        mediaType: 'text/plain',
        sizeBytes: 0,
        messageId: 'message-1',
      },
    })
  })

  test('stops a part that its signal stopped, and sends it no more', async () => {
    const stop = new AbortController()
    const answer = deferred<FileReply>()
    const setup = worker({ parts: { 2: [answer.promise] } })
    stop.signal.addEventListener('abort', () =>
      answer.reject(new DOMException('The upload stopped.', 'AbortError')),
    )
    const running = run(setup, { signal: stop.signal })
    await vi.waitFor(() => expect(setup.calls).toContain('part 2: 4567'), {
      timeout: 10_000,
    })
    stop.abort()
    const { result } = await running
    expect({ result, calls: setup.calls }).toMatchObject({
      result: { code: 'network' },
      calls: ['start', 'part 1: 0123', 'part 2: 4567'],
    })
  })
})
