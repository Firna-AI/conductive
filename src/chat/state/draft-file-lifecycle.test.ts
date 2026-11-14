import { describe, expect, it } from 'vitest'
import { fileMark } from '../../app/draft-marks'
import { flushMicrotasks } from '../../app/test-kit'
import { attachmentUploadStartPath } from '../../shared/messages'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { note } from '../../app/draft-files.test-support'
import { readyChat } from './draft-files.test-support'

const session = FAKE_IDS.session
const startPath = attachmentUploadStartPath(FAKE_IDS.org, {
  type: 'workspace',
  workspaceId: FAKE_IDS.workspace,
})

/** The uploads that the chat started, as their start calls show. */
function starts(chat: Awaited<ReturnType<typeof readyChat>>): number {
  return chat.requests('POST', startPath).length
}

describe('files held by draft marks', () => {
  it('returns file IDs before uploads finish and keeps the pick queue', async () => {
    const chat = await readyChat()
    const ids = chat.controller.attachFiles(session, [note(), note('two.txt')])
    const queued = starts(chat)
    await chat.started(1)
    expect({ ids, queued, started: chat.jobs.map((job) => job.name) }).toEqual({
      ids: ['file-1', 'file-2'],
      queued: 1,
      started: ['notes.txt'],
    })
    await chat.finish(0, 'one')
    await chat.started(2)
    expect(chat.jobs.map((job) => job.name)).toEqual(['notes.txt', 'two.txt'])
    await chat.finish(1, 'two')
  })

  it('keeps a ready file for undo and detaches only its final occurrence', async () => {
    const chat = await readyChat()
    chat.controller.attachFiles(session, [note()])
    const marked = fileMark('file-1')
    chat.controller.setDraft(session, `${marked} ${marked}`)
    await chat.started(1)
    await chat.finish(0, 'one')
    const ready = chat.draftOf(session)?.files[0]
    chat.controller.setDraft(session, marked)
    expect(chat.draftOf(session)?.files).toEqual([ready])
    chat.controller.setDraft(session, '')
    expect(chat.draftOf(session)).toMatchObject({
      files: [],
      detached: [ready],
    })
    chat.controller.setDraft(session, marked)
    expect({
      files: chat.draftOf(session)?.files,
      uploads: starts(chat),
    }).toEqual({
      files: [ready],
      uploads: 1,
    })
  })

  it('restores several stopped uploads in one queue without reviving the old queue', async () => {
    const chat = await readyChat()
    chat.controller.attachFiles(session, [
      note('first.txt'),
      note('second.txt'),
    ])
    const text = `${fileMark('file-1')} ${fileMark('file-2')}`
    chat.controller.setDraft(session, text)
    await chat.started(1)
    chat.controller.setDraft(session, '')
    chat.controller.setDraft(session, text)
    await chat.started(2)
    expect(chat.jobs.map((job) => job.name)).toEqual(['first.txt', 'first.txt'])
    expect(chat.jobs[0].signal.aborted).toBe(true)
    await chat.finish(0, 'stale')
    expect({ parts: chat.jobs.length, uploads: starts(chat) }).toEqual({
      parts: 2,
      uploads: 1,
    })
    await chat.finish(1, 'first')
    await chat.started(3)
    expect(chat.jobs.map((job) => job.name)).toEqual([
      'first.txt',
      'first.txt',
      'second.txt',
    ])
    await chat.finish(2, 'second')
    expect(chat.draftOf(session)?.files).toMatchObject([
      { id: 'file-1', state: 'ready', attachment: { id: 'first' } },
      { id: 'file-2', state: 'ready', attachment: { id: 'second' } },
    ])
  })

  it('aborts a removed upload and ignores its late progress and failure after undo', async () => {
    const chat = await readyChat()
    chat.controller.attachFiles(session, [note()])
    chat.controller.setDraft(session, fileMark('file-1'))
    await chat.started(1)
    chat.controller.setDraft(session, '')
    expect(chat.jobs[0].signal.aborted).toBe(true)
    chat.controller.setDraft(session, fileMark('file-1'))
    await chat.started(2)
    // The upload that comes back sends its part again, in the same upload.
    expect({ parts: chat.jobs.length, uploads: starts(chat) }).toEqual({
      parts: 2,
      uploads: 1,
    })
    chat.jobs[1].progress(1)
    chat.jobs[0].progress(99)
    chat.jobs[0].reject(new Error('late failure'))
    await flushMicrotasks()
    expect(chat.draftOf(session)?.files).toMatchObject([
      { state: 'uploading', sentBytes: 1 },
    ])
    await chat.finish(1, 'new')
    expect(chat.draftOf(session)?.files).toMatchObject([
      { state: 'ready', attachment: { id: 'new' } },
    ])
  })

  it('fences a removed queued start and an old success while its replacement uploads', async () => {
    const chat = await readyChat()
    chat.controller.attachFiles(session, [
      note('first.txt'),
      note('queued.txt'),
    ])
    const text = `${fileMark('file-1')} ${fileMark('file-2')}`
    chat.controller.setDraft(session, text)
    chat.controller.setDraft(session, fileMark('file-1'))
    chat.controller.setDraft(session, text)
    await chat.started(2)
    expect(chat.jobs.map((job) => job.name)).toEqual([
      'first.txt',
      'queued.txt',
    ])
    await chat.finish(0, 'first')
    expect({
      parts: chat.jobs.map((job) => job.name),
      uploads: starts(chat),
    }).toEqual({ parts: ['first.txt', 'queued.txt'], uploads: 2 })
    chat.jobs[1].progress(1)
    expect(chat.draftOf(session)?.files[1]).toMatchObject({
      state: 'uploading',
      sentBytes: 1,
    })
    chat.controller.setDraft(session, fileMark('file-1'))
    chat.controller.setDraft(session, text)
    await chat.started(3)
    await chat.finish(1, 'stale')
    expect(chat.draftOf(session)?.files[1]).toMatchObject({
      state: 'uploading',
    })
    await chat.finish(2, 'current')
    expect(chat.draftOf(session)?.files[1]).toMatchObject({
      state: 'ready',
      attachment: { id: 'current' },
    })
  })
})
