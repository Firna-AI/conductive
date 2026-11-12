import { describe, expect, it, vi } from 'vitest'
import { controlledUploads, note } from '../../app/draft-files.test-support'
import { fileMark } from '../../app/draft-marks'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { record } from '../api/json'
import { chatFor, opensSession } from './test-kit'

const session = FAKE_IDS.session
const messages = sessionPaths.messages(
  FAKE_IDS.org,
  FAKE_IDS.workspace,
  session,
)
const codex = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
} as const

function oversized(name: string): File {
  const file = note(name)
  Object.defineProperty(file, 'size', { value: 25_000_001 })
  return file
}

describe('refused folders of a chat draft', () => {
  it('owns folder-only names, ignores a cancelled pick and uploads genuine empty files', async () => {
    const uploads = controlledUploads()
    const chat = chatFor({ conversation: 'history', files: uploads.files })
    await chat.controller.start()
    chat.controller.setDraft(session, '')
    const names = ['Pictures', 'Design notes']
    expect(chat.controller.attachFiles(session, [], names)).toEqual([])
    names.push('Later mutation')
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      refused: [],
      refusedFolders: ['Pictures', 'Design notes'],
      files: [],
    })
    expect(uploads.jobs).toEqual([])
    const beforeCancel = chat.draftOf(session)
    expect(chat.controller.attachFiles(session, [])).toEqual([])
    expect(chat.draftOf(session)).toBe(beforeCancel)
    const zero = new File([], 'empty.txt', { type: 'text/plain' })
    const ids = chat.controller.attachFiles(
      session,
      [zero],
      ['Empty directory'],
    )
    expect(ids).toEqual(['file-1'])
    expect(chat.draftOf(session)).toMatchObject({
      refused: [],
      refusedFolders: ['Empty directory'],
      files: [{ id: 'file-1', file: zero }],
    })
    expect(chat.draftOf(session)?.files[0]?.file.size).toBe(0)
    expect(uploads.jobs.map((job) => job.name)).toEqual(['empty.txt'])
    chat.controller.setDraft(session, `Read ${fileMark(ids[0])}`)
    await uploads.finish(0, 'empty')
    await chat.controller.send(session)
    expect(await chat.bodies('POST', messages)).toMatchObject([
      { text: 'Read @returned/empty', attachmentIds: ['empty'] },
    ])
    expect(chat.draftOf(session)).toMatchObject({
      refused: [],
      refusedFolders: [],
    })
  })

  it('moves refusal data with its draft, replaces it on the next pick and clears it at stop', async () => {
    const chat = chatFor({
      conversation: 'history',
      answer: opensSession(codex),
    })
    await chat.controller.start()
    chat.controller.setDraft(session, 'Move this draft')
    chat.controller.attachFiles(session, [], ['Moving directory'])
    const owner = chat.draftOf(session)?.id
    chat.controller.attachFiles('debounce', [], ['Other directory'])
    await chat.controller.chooseModel(session, codex)
    const moved = chat.controller.getSnapshot().activeSessionId ?? ''
    expect(chat.draftOf(moved)).toMatchObject({
      id: owner,
      refusedFolders: ['Moving directory'],
    })
    expect(chat.draftOf(session)?.refusedFolders).toEqual([])
    expect(chat.draftOf('debounce')?.refusedFolders).toEqual([
      'Other directory',
    ])
    chat.controller.attachFiles(moved, [oversized('archive.zip')])
    expect(chat.draftOf(moved)).toMatchObject({
      refused: ['archive.zip'],
      refusedFolders: [],
    })
    chat.controller.attachFiles(moved, [], ['Last directory'])
    expect(chat.draftOf(moved)).toMatchObject({
      refused: [],
      refusedFolders: ['Last directory'],
    })
    chat.controller.stop()
    expect(chat.draftOf(moved)).toMatchObject({
      refused: [],
      refusedFolders: [],
    })
    expect(chat.draftOf('debounce')?.refusedFolders).toEqual([])
  })

  it('clears refusals when Send starts and keeps new intake during Send until the fresh reset', async () => {
    const chat = chatFor({
      conversation: 'history',
      hold: (request) => request.url.endsWith('/messages'),
    })
    await chat.controller.start()
    chat.controller.setDraft(session, 'Send these words')
    chat.controller.attachFiles(session, [], ['Before send'])
    const sending = chat.controller.send(session)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), {
      timeout: 10_000,
    })
    expect(chat.draftOf(session)).toMatchObject({
      refused: [],
      refusedFolders: [],
    })
    chat.controller.attachFiles(
      session,
      [oversized('during.zip')],
      ['During send'],
    )
    chat.held.shift()?.()
    await sending
    expect(chat.draftOf(session)).toMatchObject({
      refused: ['during.zip'],
      refusedFolders: ['During send'],
    })
    expect(
      (await chat.bodies('POST', messages)).map(
        (body) => record(body).attachmentIds,
      ),
    ).toEqual([[]])
    await chat.controller.start()
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      refused: [],
      refusedFolders: [],
    })
  })
})
