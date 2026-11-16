import { describe, expect, it, vi } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { attachmentUploadPartPath } from '../../shared/messages'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { pickChatFiles } from './draft-files.test-support'
import { chatFor } from './test-kit'

const id = FAKE_IDS.session
const partPath = attachmentUploadPartPath(
  FAKE_IDS.org,
  { type: 'workspace', workspaceId: FAKE_IDS.workspace },
  FAKE_IDS.upload,
  1,
)
const shortly = { timeout: 10_000 }

describe('the waits before a part of a chat upload goes again', () => {
  it('waits on the timers of the chat before a part goes again, and a Remove during the wait stops the upload', async () => {
    let sends = 0
    const chat = chatFor({
      conversation: 'history',
      answer: async (request) => {
        if (request.method !== 'PUT') return null
        if (new URL(request.url).pathname !== partPath) return null
        sends += 1
        return Response.json(
          {
            error: { code: 'attachment_upload_failed', message: 'Try again.' },
          },
          { status: 503 },
        )
      },
    })
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the screenshot.')
    const file = new File(['png'], 'overlap.png', { type: 'image/png' })
    const picking = pickChatFiles(chat, id, [file])
    // The first send of the part failed, so the upload waits 1 second on the
    // timers of the chat. The chip leaves the text during that wait.
    await vi.waitFor(
      () => expect(chat.timers.waits()).toContain(1_000),
      shortly,
    )
    chat.controller.setDraft(id, 'See the screenshot.')
    await picking
    chat.timers.run(1_000)
    await flushMicrotasks()
    expect({
      sends,
      files: chat.draftOf(id)?.files,
      detached: chat.draftOf(id)?.detached.map((item) => item.state),
    }).toEqual({ sends: 1, files: [], detached: ['uploading'] })
  })
})
