// @vitest-environment happy-dom

import { act, useEffect, useState } from 'react'
import { describe, expect, test } from 'vitest'
import type { Workspace } from '../../../shared/workspaces'
import { accessibleName, byRole } from '../../../test-support/dom-queries'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  focusMessage,
  messageText,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { mount } from '../../../test-support/mount'
import { LinksProvider } from '../../links/LinksContext'
import { ChipTextField } from './ChipTextField'

const listed = workspaceFixtures().workspaces.workspaces
const linked = listed[0] as Workspace
const chipName = `W-${linked.number} ${linked.name}, Starting`

/** The owner of the field, which keeps its draft, as a composer does. */
interface Owner {
  setValue: (value: string) => void
  setList: (list: readonly Workspace[] | null) => void
}

async function mountField(
  options: {
    value?: string
    list?: readonly Workspace[] | null
    editable?: boolean
    caretAtEnd?: boolean
  } = {},
) {
  const owner: Partial<Owner> = {}
  function Field() {
    const [value, setValue] = useState(options.value ?? '')
    const [list, setList] = useState(
      options.list === undefined ? listed : options.list,
    )
    useEffect(() => {
      owner.setValue = setValue
      owner.setList = setList
    }, [])
    const links = { orgId: FAKE_IDS.org, workspaces: list }
    return (
      <LinksProvider value={{ links }}>
        <ChipTextField
          caretAtEnd={options.caretAtEnd}
          editable={options.editable}
          label="Message"
          lines={2}
          maxLines={8}
          onChangeText={setValue}
          placeholder="Message the agent"
          value={value}
        />
        <output>{value}</output>
      </LinksProvider>
    )
  }
  const { container } = await mount(<Field />)
  const field = byRole('textbox', 'Message', container)
  return {
    field,
    draft: () => container.querySelector('output')?.textContent,
    chips: () =>
      Array.from(field.querySelectorAll('[contenteditable="false"]'), (chip) =>
        accessibleName(chip),
      ),
    /** A change of the owner, and the work of the field that follows it. */
    set: async (change: (owner: Owner) => void) => {
      await act(async () => change(owner as Owner))
    },
  }
}

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
})
