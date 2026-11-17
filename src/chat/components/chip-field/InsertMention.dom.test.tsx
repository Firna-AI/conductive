// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test } from 'vitest'
import {
  chromeFocusOnCaret,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { editorOf, selectText } from './attached-field-events'
import { mountAttachedField } from './attached-field-test-kit'
import { sampleTree } from './mention-field-test-kit'

const form = 'src/app/checkout/AddressForm.tsx'

describe('the chip of Add to chat in the message field', () => {
  test('goes in at the caret of a field without the focus, with a space, as one step of undo, and with the focus the caret stands after the chip', async () => {
    const view = await mountAttachedField({ tree: sampleTree })
    typeMessage(view.field, 'Look at please')
    selectText(view.field, 'Look at please', 'Look at '.length, 8)
    act(() => view.field.blur())
    act(() => view.handle().insertMention({ path: form, folder: false }, true))
    const inserted = {
      draft: view.draft(),
      chips: view.chips(),
      focused: document.activeElement === view.field,
    }
    pasteMessage(view.field, 'now ')
    const typed = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ inserted, typed, undone: view.draft() }).toEqual({
      inserted: {
        draft: `Look at @${form} please`,
        chips: ['File AddressForm.tsx'],
        focused: true,
      },
      typed: `Look at @${form} now please`,
      undone: 'Look at please',
    })
  })

  test('without the focus, goes in at the end of a field with no caret, names a folder with a final slash, takes no focus at a later commit in Chrome, and leaves out an entry that the list does not offer', async () => {
    onTestFinished(chromeFocusOnCaret())
    const view = await mountAttachedField({ tree: sampleTree, value: 'See' })
    act(() => {
      view.handle().insertMention({ path: 'src/lib', folder: true }, false)
      view.handle().insertMention({ path: 'src/gone.ts', folder: false }, false)
      view.handle().insertMention({ path: 'src/lib', folder: false }, false)
    })
    const folder = { draft: view.draft(), chips: view.chips() }
    // The root of the editor attaches again, as in the strict mode of React,
    // and the editor commits its state again.
    const editor = editorOf(view.field)
    act(() => {
      editor.setRootElement(null)
      editor.setRootElement(view.field)
    })
    const focused = document.activeElement === view.field
    act(() => view.handle().focus())
    pasteMessage(view.field, 'now')
    expect({ folder, focused, typed: view.draft() }).toEqual({
      folder: { draft: 'See @src/lib/ ', chips: ['Folder lib'] },
      focused: false,
      typed: 'See @src/lib/ now',
    })
  })
})
