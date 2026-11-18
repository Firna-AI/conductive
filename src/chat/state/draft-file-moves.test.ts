import { describe, expect, it, vi } from 'vitest'
import { fileMark, literalText } from '../../app/draft-marks'
import { flushMicrotasks } from '../../app/test-kit'
import { attachmentUploadStartPath } from '../../shared/messages'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  controlledUploads,
  note,
  refusedPart,
} from '../../app/draft-files.test-support'
import { chatFor, opensSession } from './test-kit'

const session = FAKE_IDS.session
const codex = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
  fast: false,
} as const
const modelPath = sessionPaths.model(FAKE_IDS.org, FAKE_IDS.workspace, session)
const startPath = attachmentUploadStartPath(FAKE_IDS.org, {
  type: 'workspace',
  workspaceId: FAKE_IDS.workspace,
})

describe('marked files when a draft moves or ends', () => {
  it('keeps its source during store notifications before React rebinds the moved session', async () => {
    const uploads = controlledUploads()
    const chat = chatFor({
      uploads,
      conversation: 'history',
      answer: opensSession(codex),
    })
    await chat.controller.start()
    chat.controller.attachFiles(session, [note(), note('detached.txt')])
    chat.controller.setDraft(
      session,
      `${fileMark('file-1')} ${fileMark('file-2')}`,
    )
    await uploads.started(1)
    await uploads.finish(0, 'one')
    await uploads.started(2)
    await uploads.finish(1, 'two')
    chat.controller.setDraft(session, fileMark('file-1'))
    const source = chat.controller.draftFiles(chat.draftOf(session)?.id ?? '')
    const notifications: string[][] = []
    const stop = source.subscribe(() => {
      notifications.push(source.files().map(({ id }) => id))
    })
    await chat.controller.chooseModel(session, codex)
    stop()
    expect(notifications.length).toBeGreaterThan(0)
    for (const ids of notifications) expect(ids).toEqual(['file-1', 'file-2'])
    expect(source.files()).toMatchObject([{ id: 'file-1' }, { id: 'file-2' }])
    const moved = chat.controller.getSnapshot().activeSessionId ?? ''
    chat.controller.setDraft(
      moved,
      `${fileMark('file-2')} ${fileMark('file-1')}`,
    )
    expect(chat.draftOf(moved)?.files.map(({ id }) => id)).toEqual([
      'file-2',
      'file-1',
    ])
    chat.controller.attachFiles(moved, [note('fails.txt')])
    chat.controller.setDraft(
      moved,
      `${chat.draftOf(moved)?.text} ${fileMark('file-3')}`,
    )
    await uploads.started(3)
    uploads.jobs[2].resolve(refusedPart)
    await flushMicrotasks()
    source.retry('file-3')
    await uploads.started(4)
    expect(uploads.jobs).toHaveLength(4)
    await uploads.finish(3, 'three')
    expect(source.files()[2]).toMatchObject({
      state: 'ready',
      attachment: { id: 'three' },
    })
    expect(chat.draftOf(session)?.files).toEqual([])
  })

  it('moves encoded text unchanged and removes every unkept mark including a now detached file', async () => {
    const uploads = controlledUploads()
    const chat = chatFor({
      uploads,
      conversation: 'history',
      answer: opensSession(codex, (id) => id === 'one'),
      hold: (request) => request.url.endsWith('/model'),
    })
    await chat.controller.start()
    chat.controller.attachFiles(session, [
      note(),
      note('drops.txt'),
      note('detached.txt'),
    ])
    const literal = literalText('Read \uE000literal\uE001-\uE0020 ')
    const text = `${literal}${fileMark('file-2')} ${fileMark('file-1')} ${fileMark('file-2')}`
    chat.controller.setDraft(session, `${text} ${fileMark('file-3')}`)
    await uploads.started(1)
    await uploads.finish(0, 'one')
    await uploads.started(2)
    await uploads.finish(1, 'two')
    await uploads.started(3)
    await uploads.finish(2, 'three')
    const picking = chat.controller.chooseModel(session, codex)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), {
      timeout: 10_000,
    })
    chat.controller.setDraft(session, text)
    chat.held.shift()?.()
    await picking
    expect(await chat.bodies('PUT', modelPath)).toMatchObject([
      {
        draft: {
          text: `${text} ${fileMark('file-3')}`,
          attachmentIds: ['two', 'one', 'three'],
        },
      },
    ])
    const moved = chat.controller.getSnapshot().activeSessionId ?? ''
    expect(chat.draftOf(moved)).toMatchObject({
      text: `${literal} ${fileMark('file-1')} `,
      files: [{ id: 'file-1' }],
      detached: [],
    })
    const source = chat.controller.draftFiles(chat.draftOf(moved)?.id ?? '')
    expect(source.files().map(({ id }) => id)).toEqual(['file-1'])
  })

  it('ends attached and detached files with a stopped chat and ignores late uploads', async () => {
    const uploads = controlledUploads()
    const chat = chatFor({ uploads, conversation: 'history' })
    await chat.controller.start()
    chat.controller.attachFiles(session, [note(), note('queued.txt')])
    const literal = literalText('Read \uE000literal\uE001-\uE0020 ')
    chat.controller.setDraft(
      session,
      `${literal}${fileMark('file-1')} ${fileMark('file-2')}`,
    )
    await uploads.started(1)
    chat.controller.setDraft(session, `${literal}${fileMark('file-1')}`)
    const source = chat.controller.draftFiles(chat.draftOf(session)?.id ?? '')
    chat.controller.stop()
    expect(chat.draftOf(session)).toMatchObject({
      text: literal,
      files: [],
      detached: [],
    })
    expect(source.files()).toEqual([])
    expect(uploads.jobs[0].signal.aborted).toBe(true)
    await uploads.finish(0, 'stale')
    expect({
      parts: uploads.jobs.length,
      uploads: chat.requests('POST', startPath).length,
    }).toEqual({ parts: 1, uploads: 1 })
    expect(source.files()).toEqual([])
  })
})
