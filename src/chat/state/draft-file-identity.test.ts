import { describe, expect, it } from 'vitest'
import { note } from '../../app/draft-files.test-support'
import { fileMark } from '../../app/draft-marks'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { readyChat } from './draft-files.test-support'

const session = FAKE_IDS.session

describe('file ownership after a fresh controller start', () => {
  it('clears the old draft and keeps its source from reading files of the new draft', async () => {
    const chat = await readyChat()
    const [oldId] = chat.controller.attachFiles(session, [note('old.txt')])
    chat.controller.setDraft(session, `Old words ${fileMark(oldId)}`)
    await chat.started(1)
    await chat.finish(0, 'old')
    const owner = chat.draftOf(session)?.id ?? ''
    const oldSource = chat.controller.draftFiles(owner)
    await chat.controller.start()
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      files: [],
      detached: [],
    })
    expect(oldSource.files()).toEqual([])
    const [newId] = chat.controller.attachFiles(session, [note('new.txt')])
    chat.controller.setDraft(session, `New words ${fileMark(newId)}`)
    expect(oldSource.files()).toEqual([])
    const current = chat.draftOf(session)
    expect(current?.id).not.toBe(owner)
    const newSource = chat.controller.draftFiles(current?.id ?? '')
    expect(newSource.files()).toMatchObject([
      { id: newId, file: { name: 'new.txt' } },
    ])
    await chat.started(2)
    await chat.finish(1, 'new')
    expect(newSource.files()).toMatchObject([
      { state: 'ready', attachment: { id: 'new' } },
    ])
    expect(oldSource.files()).toEqual([])
  })
})
