// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import {
  clearMessage,
  focusMessage,
  messageText,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { byRole } from '../../../test-support/dom-queries'
import { press } from '../../../test-support/mount'
import { chipName, linked, listed, mountField } from './chip-field-test-kit'

describe('the chip text field', () => {
  test('a paste turns each workspace link into a chip at once, keeps plain text, and the draft keeps the link', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Compare ')
    const other = 'https://example.com/orgs/acme/workspaces/x'
    const paste = pasteMessage(view.field, `${linked.link} with\n${other}`)
    expect({
      kept: paste.defaultPrevented,
      chips: view.chips(),
      draft: view.draft(),
      text: messageText(view.field),
    }).toEqual({
      kept: true,
      chips: [chipName],
      draft: `Compare ${linked.link} with\n${other}`,
      text: `Compare ${linked.link} with\n${other}`,
    })
  })

  test('one arrow press steps over a chip, and Backspace and Delete remove it whole', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Compare ')
    pasteMessage(view.field, linked.link)
    pressInField(view.field, 'ArrowLeft')
    pasteMessage(view.field, 'X')
    const stepped = { draft: view.draft(), chips: view.chips() }
    pressInField(view.field, 'Delete')
    const deleted = { draft: view.draft(), chips: view.chips() }
    pasteMessage(view.field, linked.link)
    pressInField(view.field, 'Backspace')
    expect({
      stepped,
      deleted,
      backspace: { draft: view.draft(), chips: view.chips() },
    }).toEqual({
      stepped: { draft: `Compare X${linked.link}`, chips: [chipName] },
      deleted: { draft: 'Compare X', chips: [] },
      backspace: { draft: 'Compare X', chips: [] },
    })
  })

  test('a press on the × of the mark of a chip removes it, and undo brings it back', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Compare ')
    pasteMessage(view.field, `${linked.link} now`)
    const remove = byRole(
      'button',
      `Remove W-${linked.number} ${linked.name}`,
      view.field,
    )
    await press(remove)
    const removed = { draft: view.draft(), chips: view.chips() }
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({
      tabIndex: remove.tabIndex,
      removed,
      undone: { draft: view.draft(), chips: view.chips() },
    }).toEqual({
      tabIndex: -1,
      removed: { draft: 'Compare  now', chips: [] },
      undone: { draft: `Compare ${linked.link} now`, chips: [chipName] },
    })
  })

  test('a removal with the × as the first change after mount is one step of undo', async () => {
    const view = await mountField({ value: `See ${linked.link} now` })
    await press(
      byRole('button', `Remove W-${linked.number} ${linked.name}`, view.field),
    )
    const removed = view.draft()
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ removed, undone: view.draft(), chips: view.chips() }).toEqual({
      removed: 'See  now',
      undone: `See ${linked.link} now`,
      chips: [chipName],
    })
  })

  test('a draft that comes back shows its chips, and undo keeps it', async () => {
    const view = await mountField()
    typeMessage(view.field, 'An older draft')
    await view.set((owner) => owner.setValue(`Back to ${linked.link} now`))
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({
      chips: view.chips(),
      text: messageText(view.field),
      draft: view.draft(),
    }).toEqual({
      chips: [chipName],
      text: `Back to ${linked.link} now`,
      draft: `Back to ${linked.link} now`,
    })
  })

  test('undo stays with its draft: after a switch to another draft with equal text, undo gives it no text of the last draft, and the focus stays as it was', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Only for the first session')
    clearMessage(view.field)
    pressInField(view.field, 'z', { ctrlKey: true })
    const undone = view.draft()
    clearMessage(view.field)
    await view.set((owner) => owner.show('second'))
    const handoff = {
      focused: document.activeElement === view.field,
      sameField: view.fieldNow() === view.field,
    }
    pressInField(view.field, 'z', { ctrlKey: true })
    const second = view.draft()
    typeMessage(view.field, 'For the second session')
    clearMessage(view.field)
    pressInField(view.field, 'z', { ctrlKey: true })
    act(() => view.field.blur())
    await view.set((owner) => owner.show('first'))
    expect({
      undone,
      handoff,
      second,
      toSecond: view.changes
        .filter((change) => change.session === 'second')
        .map((change) => change.text),
      first: view.draft(),
      takesFocus: document.activeElement === view.field,
    }).toEqual({
      undone: 'Only for the first session',
      handoff: { focused: true, sameField: true },
      second: '',
      toSecond: ['For the second session', '', 'For the second session'],
      first: '',
      takesFocus: false,
    })
  })

  test('a draft that moves to another session with its identity keeps its undo, which then goes to that session', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Moves with its draft')
    clearMessage(view.field)
    await view.set((owner) => owner.moveTo('third'))
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ draft: view.draft(), last: view.changes.at(-1) }).toEqual({
      draft: 'Moves with its draft',
      last: { session: 'third', text: 'Moves with its draft' },
    })
  })

  test('a copy gives plain text with the link of each chip, kept apart from the text beside it', async () => {
    const view = await mountField()
    typeMessage(view.field, 'See')
    pasteMessage(view.field, linked.link)
    pasteMessage(view.field, "'s tests")
    view.field.focus()
    pressInField(view.field, 'a', { ctrlKey: true })
    const data = new DataTransfer()
    act(() => {
      view.field.dispatchEvent(
        new ClipboardEvent('copy', {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      )
    })
    expect(data.getData('text/plain')).toBe(`See${linked.link} 's tests`)
  })

  test('the list turns a pasted link into a chip once it loads, and a chip whose workspace leaves it into text, while typed links stay text', async () => {
    const view = await mountField({ list: null })
    typeMessage(view.field, linked.link)
    pasteMessage(view.field, ` and ${linked.link}`)
    const loading = view.chips()
    await view.set((owner) => owner.setList(listed))
    const loaded = { chips: view.chips(), text: messageText(view.field) }
    await view.set((owner) =>
      owner.setList(listed.filter((item) => item.id !== linked.id)),
    )
    expect({
      loading,
      loaded,
      left: { chips: view.chips(), text: messageText(view.field) },
    }).toEqual({
      loading: [],
      loaded: {
        chips: [chipName],
        text: `${linked.link} and ${linked.link}`,
      },
      left: { chips: [], text: `${linked.link} and ${linked.link}` },
    })
  })

  test('with the caret at the end, a kept draft takes the caret at its end at the first focus, and a focus after a click outside keeps the caret where the user put it', async () => {
    const view = await mountField({
      caretAtEnd: true,
      value: `Compare ${linked.link}`,
    })
    focusMessage(view.field)
    pressInField(view.field, 'ArrowLeft')
    pasteMessage(view.field, 'X')
    const first = view.draft()
    // A click outside the field moves the caret of the page there.
    act(() => {
      view.field.blur()
      document.getSelection()?.collapse(document.body, 0)
    })
    focusMessage(view.field)
    pasteMessage(view.field, 'Y')
    expect({ first, later: view.draft() }).toEqual({
      first: `Compare X${linked.link}`,
      later: `Compare XY${linked.link}`,
    })
  })

  test('a field that takes no change keeps its role and its place in the order of Tab', async () => {
    const view = await mountField({ editable: false, value: 'Sending' })
    expect({
      readOnly: view.field.getAttribute('aria-readonly'),
      tab: view.field.tabIndex,
      text: messageText(view.field),
    }).toEqual({ readOnly: 'true', tab: 0, text: 'Sending' })
  })

  test('a field without attached files keeps private-use characters as typed text in a draft that comes back, in typing, in a paste, and in a copy', async () => {
    const marked = 'notes'
    const view = await mountField()
    await view.set((owner) => owner.setValue(`Back ${marked} here`))
    const restored = { draft: view.draft(), text: messageText(view.field) }
    typeMessage(view.field, `Typed ${marked} too`)
    const typed = view.draft()
    pasteMessage(view.field, ` and ${marked}`)
    const pasted = view.draft()
    view.field.focus()
    pressInField(view.field, 'a', { ctrlKey: true })
    const data = new DataTransfer()
    act(() => {
      view.field.dispatchEvent(
        new ClipboardEvent('copy', {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      )
    })
    expect({
      restored,
      typed,
      pasted,
      copied: data.getData('text/plain'),
    }).toEqual({
      restored: { draft: `Back ${marked} here`, text: `Back ${marked} here` },
      typed: `Typed ${marked} too`,
      pasted: `Typed ${marked} too and ${marked}`,
      copied: `Typed ${marked} too and ${marked}`,
    })
  })
})
