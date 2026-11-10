// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import {
  messageText,
  pressInField,
  typeAtEnd,
  typeMessage,
} from '../../../test-support/message-field'
import { mountField } from './chip-field-test-kit'
import { entry, mountMentionField, sampleTree } from './mention-field-test-kit'

describe('the list of @', () => {
  test('@ and a query open the list in the host above the box, with the best matches first and the first highlighted', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Reuse the check from @addr')
    expect({
      inHost: view.inHost(),
      rows: view.rows(),
      highlighted: view.highlighted(),
      active: view.field.getAttribute('aria-activedescendant'),
      controls: view.field.getAttribute('aria-controls'),
    }).toEqual({
      inHost: true,
      rows: [
        'addresses, src/app/api/',
        'AddressForm.tsx, src/app/checkout/',
        'useAddressAutocomplete.ts, src/app/checkout/',
        'route.ts, src/app/api/addresses/',
      ],
      highlighted: 'addresses, src/app/api/',
      active: 'file-mention-list-0',
      controls: 'file-mention-list',
    })
  })

  test('the arrow keys move the highlight, and Enter picks the row, puts its chip and a space in place of the query, and sends nothing', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Reuse the check from @addr')
    pressInField(view.field, 'ArrowDown')
    pressInField(view.field, 'ArrowDown')
    pressInField(view.field, 'ArrowUp')
    const enter = pressInField(view.field, 'Enter')
    typeMessage(view.field, `${messageText(view.field)}now`)
    expect({
      kept: enter.defaultPrevented,
      sends: view.sends(),
      rows: view.rows(),
      draft: view.draft(),
    }).toEqual({
      kept: true,
      sends: 0,
      rows: [],
      draft: 'Reuse the check from @src/app/checkout/AddressForm.tsx now',
    })
  })

  test('Tab picks a folder, whose mention ends with /, and a path with a space goes in quotes', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Look at @lib')
    pressInField(view.field, 'Tab')
    const folder = view.draft()
    typeMessage(view.field, 'Read @notes')
    pressInField(view.field, 'Tab')
    expect({ folder, quoted: view.draft() }).toEqual({
      folder: 'Look at @src/lib/ ',
      quoted: 'Read @"docs/My notes.md" ',
    })
  })

  test('Esc closes the list and keeps the text, and then Enter sends again', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Fix @addr')
    const escape = pressInField(view.field, 'Escape')
    const closed = { rows: view.rows(), draft: view.draft() }
    pressInField(view.field, 'Enter')
    expect({
      kept: escape.defaultPrevented,
      closed,
      sends: view.sends(),
    }).toEqual({
      kept: true,
      closed: { rows: [], draft: 'Fix @addr' },
      sends: 1,
    })
  })

  test('a space after the query, or an @ inside a word, opens no list', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Fix @addr then')
    const spaced = view.rows()
    typeMessage(view.field, 'mail cal@addr')
    expect({ spaced, inWord: view.rows() }).toEqual({ spaced: [], inWord: [] })
  })

  test('one line takes the place of the rows while the tree loads, without a tree, and with no match, and Enter then sends nothing', async () => {
    const view = await mountMentionField({ tree: null })
    typeMessage(view.field, 'Fix @addr')
    const loading = view.line()
    await view.setTree({ tree: null, treeError: null, treeUnavailable: true })
    const unavailable = view.line()
    await view.setTree([])
    const none = view.line()
    pressInField(view.field, 'Enter')
    expect({ loading, unavailable, none, sends: view.sends() }).toEqual({
      loading: 'Loading files…',
      unavailable: 'The list of all files is unavailable',
      none: 'Nothing matches “addr”',
      sends: 0,
    })
  })

  test('a draft that comes back with a query lets typing continue the query, and a tree that loads makes no chip of it', async () => {
    const view = await mountMentionField({
      tree: null,
      value: 'Read @src/app/checkout',
    })
    typeAtEnd(view.field, '/Addr')
    const rowsWhileLoading = view.line()
    await view.setTree(sampleTree)
    expect({
      rowsWhileLoading,
      rows: view.rows(),
      chips: view.chips(),
      draft: view.draft(),
    }).toEqual({
      rowsWhileLoading: 'Loading files…',
      rows: ['AddressForm.tsx, src/app/checkout/'],
      chips: [],
      draft: 'Read @src/app/checkout/Addr',
    })
  })

  test('a draft that comes back with a query of no entry lets typing narrow the list', async () => {
    const view = await mountMentionField({ value: 'Read @addr' })
    typeAtEnd(view.field, 'essF')
    expect({ rows: view.rows(), draft: view.draft() }).toEqual({
      rows: ['AddressForm.tsx, src/app/checkout/'],
      draft: 'Read @addressF',
    })
  })

  test('each row shows the icon that All files gives its entry', async () => {
    const view = await mountMentionField({
      tree: [entry('scripts', 'directory'), entry('scripts/app.py')],
    })
    typeMessage(view.field, 'Run @app')
    const icons = Array.from(
      document.querySelectorAll('[role="option"] svg'),
      (icon) => icon.getAttribute('class'),
    )
    expect(icons).toEqual([expect.stringContaining('lucide-file-code')])
  })

  test('a field without the files of a chat, as in New workspace, opens no list', async () => {
    const view = await mountField()
    typeMessage(view.field, 'Fix @addr')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
})
