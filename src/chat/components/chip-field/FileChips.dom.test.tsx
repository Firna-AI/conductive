// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { byRole } from '../../../test-support/dom-queries'
import {
  messageText,
  pasteMessage,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { press } from '../../../test-support/mount'
import { mountMentionField, sampleTree } from './mention-field-test-kit'

const hook = 'src/app/checkout/useAddressAutocomplete.ts'
const draft = `Move @${hook} into @src/lib/ now`

describe('file chips in the message field', () => {
  test('a draft shows each mention of an entry as a chip with its name, and keeps each mention', async () => {
    const view = await mountMentionField({ value: draft })
    expect({ chips: view.chips(), text: messageText(view.field) }).toEqual({
      chips: ['File useAddressAutocomplete.ts', 'Folder lib'],
      text: draft,
    })
  })

  test('a press on the name of a chip opens the file, or shows the folder', async () => {
    const view = await mountMentionField({ value: draft })
    await press(byRole('button', 'useAddressAutocomplete.ts', view.field))
    await press(byRole('button', 'lib', view.field))
    expect({ opened: view.opened, shown: view.shown }).toEqual({
      opened: [hook],
      shown: ['src/lib'],
    })
  })

  test('the × of the icon removes a chip as one step of undo', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Move ')
    pasteMessage(view.field, `@${hook} into @src/lib/ now`)
    await press(byRole('button', 'Remove lib', view.field))
    const removed = { chips: view.chips(), draft: view.draft() }
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ removed, undone: view.chips() }).toEqual({
      removed: {
        chips: ['File useAddressAutocomplete.ts'],
        draft: `Move @${hook} into  now`,
      },
      undone: ['File useAddressAutocomplete.ts', 'Folder lib'],
    })
  })

  test('a removal with the × as the first change after a draft shows is one step of undo', async () => {
    const view = await mountMentionField({ value: draft })
    await press(byRole('button', 'Remove lib', view.field))
    const removed = view.chips()
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({ removed, undone: view.chips(), text: view.draft() }).toEqual({
      removed: ['File useAddressAutocomplete.ts'],
      undone: ['File useAddressAutocomplete.ts', 'Folder lib'],
      text: draft,
    })
  })

  test('a pasted mention becomes a chip, and typed text stays text', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'See @README.md and ')
    const typed = view.chips()
    pasteMessage(view.field, '@README.md')
    expect({ typed, pasted: view.chips() }).toEqual({
      typed: [],
      pasted: ['File README.md'],
    })
  })

  test('a mention becomes a chip when the tree gains its entry, and text when the entry leaves', async () => {
    const view = await mountMentionField({ tree: null, value: draft })
    const loading = view.chips()
    await view.setTree(sampleTree)
    const loaded = view.chips()
    await view.setTree(sampleTree.filter((item) => item.path !== 'src/lib'))
    expect({
      loading,
      loaded,
      left: view.chips(),
      text: messageText(view.field),
    }).toEqual({
      loading: [],
      loaded: ['File useAddressAutocomplete.ts', 'Folder lib'],
      left: ['File useAddressAutocomplete.ts'],
      text: draft,
    })
  })
})
