// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import {
  $createRangeSelection,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
} from 'lexical'
import { draftParts, fileMark } from '../../../app/draft-marks'
import { mentionText } from '../../../shared/mention-text'
import { holdAnimationFrames } from '../../../test-support/mount'
import {
  clearMessage,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import {
  clip,
  dragSelection,
  editorOf,
  layOutPoint,
  textNode,
} from './attached-field-events'
import {
  mountAttachedField,
  readyFile,
  uploadingFile,
} from './attached-field-test-kit'
import { entry } from './mention-field-test-kit'

// The words of the chip, as `accessibleName` reads them, with no space
// between the name and the label. Chrome reads them with one.
const shotChip = 'Attached file shot.png2 KB'

function selectAll(field: HTMLElement) {
  pressInField(field, 'a', { ctrlKey: true })
}

/** Selects the one chip of the field, between the texts on each side of it. */
function selectChip(field: HTMLElement) {
  act(() =>
    editorOf(field).update(
      () => {
        const block = $getRoot().getFirstChild()
        const [before, , after] = $isElementNode(block)
          ? block.getChildren()
          : []
        if (!$isTextNode(before) || !$isTextNode(after)) return
        const selection = $createRangeSelection()
        selection.anchor.set(
          before.getKey(),
          before.getTextContentSize(),
          'text',
        )
        selection.focus.set(after.getKey(), 0, 'text')
        $setSelection(selection)
      },
      { discrete: true },
    ),
  )
}

describe('the clipboard and the drag of attached files', () => {
  test('a copy gives the mention of a ready chip and the name of another chip, and a paste of that copy in the same draft gives each chip back', async () => {
    const shot = await readyFile('draft-shot', 'shot.png')
    const view = await mountAttachedField({
      files: [shot, uploadingFile('draft-notes', 'notes.md', 512)],
      value: `Read ${fileMark('draft-shot')} and ${fileMark('draft-notes')} now`,
    })
    selectAll(view.field)
    const copied = clip(view.field, 'copy')
    clearMessage(view.field)
    pasteMessage(view.field, copied)
    expect({ copied, draft: view.draft() }).toEqual({
      copied: `Read ${mentionText(shot.attachment.path ?? '', false)} and notes.md now`,
      draft: `Read ${fileMark('draft-shot')} and ${fileMark('draft-notes')} now`,
    })
  })

  test('a cut and a paste in the same field keep the chip with its file after its chip left the text, each as one step of undo', async () => {
    holdAnimationFrames()
    const view = await mountAttachedField({
      files: [uploadingFile('draft-notes', 'notes.md', null)],
      value: `Move ${fileMark('draft-notes')} here`,
    })
    selectAll(view.field)
    const cut = clip(view.field, 'cut')
    const left = view.draft()
    pasteMessage(view.field, cut)
    const pasted = { draft: view.draft(), chips: view.chips() }
    pressInField(view.field, 'z', { ctrlKey: true })
    const undone = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ cut, left, pasted, undone, before: view.draft() }).toEqual({
      cut: 'Move notes.md here',
      left: '',
      pasted: {
        draft: `Move ${fileMark('draft-notes')} here`,
        chips: ['Attached file notes.mdUploading'],
      },
      undone: '',
      before: `Move ${fileMark('draft-notes')} here`,
    })
  })

  test('a paste of the mention of a ready file of the draft gives its chip, and a kept copy gives its chips back only in its own draft while the draft holds their files', async () => {
    holdAnimationFrames()
    const shot = await readyFile('draft-shot', 'shot.png')
    const notes = uploadingFile('draft-notes', 'notes.md', null)
    const view = await mountAttachedField({ files: [shot, notes] })
    const mention = mentionText(shot.attachment.path ?? '', false)
    pasteMessage(view.field, `See ${mention} now`)
    const fromMention = view.draft()
    await view.set((owner) => owner.setValue(`${fileMark('draft-notes')} `))
    selectAll(view.field)
    const copied = clip(view.field, 'copy')
    await view.set((owner) => owner.show('draft:second', ''))
    pasteMessage(view.field, copied)
    const otherDraft = view.draft()
    await view.set((owner) => owner.show('draft:first', ''))
    pasteMessage(view.field, copied)
    const ownDraft = view.draft()
    await act(async () => view.store.set([shot]))
    clearMessage(view.field)
    pasteMessage(view.field, copied)
    expect({
      fromMention,
      copied,
      otherDraft,
      ownDraft,
      afterItsFile: view.draft(),
    }).toEqual({
      fromMention: `See ${fileMark('draft-shot')} now`,
      copied: 'notes.md ',
      otherDraft: 'notes.md ',
      ownDraft: `${fileMark('draft-notes')} `,
      afterItsFile: 'notes.md ',
    })
  })

  test('typing or a paste of the characters of a mark makes no chip and keeps them as text, also after the draft comes back', async () => {
    const view = await mountAttachedField({
      files: [await readyFile('draft-shot', 'shot.png')],
    })
    // The characters of the mark of a file of the draft, as a person can
    // type or paste them.
    const characters = fileMark('draft-shot')
    const parts = () => draftParts(view.draft() ?? '')
    typeMessage(view.field, `Typed ${characters}`)
    const typed = { draft: parts(), shown: view.field.textContent }
    pasteMessage(view.field, ` and ${characters}`)
    const pasted = { draft: parts(), shown: view.field.textContent }
    const draft = view.draft() ?? ''
    await view.set((owner) => owner.show('draft:back', draft))
    const once = `Typed ${characters}`
    const twice = `${once} and ${characters}`
    expect({ typed, pasted, back: parts(), chips: view.chips() }).toEqual({
      typed: { draft: [{ kind: 'text', text: once }], shown: once },
      pasted: { draft: [{ kind: 'text', text: twice }], shown: twice },
      back: [{ kind: 'text', text: twice }],
      chips: [],
    })
  })

  test('a picked mention of a path with the characters of a mark and of their escape keeps its chip and its exact path beside an attached file: in the draft, in a draft that comes back for another owner, and in a copy and a paste in the same draft', async () => {
    holdAnimationFrames()
    // A Git path can hold each character but NUL, and the list of `@`
    // offers it. This one holds the characters of a whole mark, then a lone
    // end of a mark and the escape of draft text before a digit.
    const path = 'src/\uE000ordinary-name\uE001-\uE001\uE0020.ts'
    const view = await mountAttachedField({
      files: [uploadingFile('draft-notes', 'notes.md', null)],
      tree: [entry('src', 'directory'), entry(path)],
    })
    typeMessage(view.field, 'Read @ordinary')
    pressInField(view.field, 'Enter')
    act(() => view.handle().insertFiles(['draft-notes']))
    const state = () => ({
      chips: view.chips(),
      parts: draftParts(view.draft() ?? ''),
    })
    const picked = state()
    const draft = view.draft() ?? ''
    await view.set((owner) => owner.show('draft:back', draft))
    const back = state()
    selectAll(view.field)
    const copied = clip(view.field, 'copy')
    clearMessage(view.field)
    pasteMessage(view.field, copied)
    const mention = mentionText(path, false)
    const kept = {
      chips: [
        'File \uE000ordinary-name\uE001-\uE001\uE0020.ts',
        'Attached file notes.mdUploading',
      ],
      parts: [
        { kind: 'text', text: `Read ${mention} ` },
        { kind: 'file', id: 'draft-notes' },
        { kind: 'text', text: ' ' },
      ],
    }
    expect({ picked, back, copied, pasted: state() }).toEqual({
      picked: kept,
      back: kept,
      copied: `Read ${mention} notes.md `,
      pasted: kept,
    })
  })

  test('a drag of a chip in the field moves it with its file and gives its mention, and a drop inside the dragged text keeps it', async () => {
    const shot = await readyFile('draft-shot', 'shot.png')
    const view = await mountAttachedField({
      files: [shot],
      value: `Put ${fileMark('draft-shot')} last.`,
    })
    selectChip(view.field)
    const end = layOutPoint({
      over: view.field,
      node: textNode(view.field, 'last.'),
      offset: ' last.'.length,
    })
    const move = dragSelection(view.field, end)
    const moved = {
      draft: view.draft(),
      chips: view.chips(),
      plain: move.data.getData('text/plain'),
      html: move.data.getData('text/html'),
      taken: move.drop.defaultPrevented,
    }
    selectAll(view.field)
    const inside = layOutPoint({
      over: view.field,
      node: textNode(view.field, 'last.'),
      offset: 2,
    })
    const kept = dragSelection(view.field, inside)
    expect({
      moved,
      inside: { draft: view.draft(), taken: kept.drop.defaultPrevented },
    }).toEqual({
      moved: {
        draft: `Put  last. ${fileMark('draft-shot')}`,
        chips: [shotChip],
        plain: mentionText(shot.attachment.path ?? '', false),
        html: '',
        taken: true,
      },
      inside: { draft: `Put  last. ${fileMark('draft-shot')}`, taken: true },
    })
  })
})
