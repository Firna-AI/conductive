// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { Session } from '../../../shared/generated/Session'
import { HeldRequests } from '../../../app/test-kit'
import { selectText } from '../../../chat/components/chip-field/attached-field-events'
import {
  focused,
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import type { FilesTarget } from '../../../files/navigation'
import { chatHistoryPath } from '../../../shared/events'
import { sessionsPath } from '../../../shared/sessions'
import { workspaceViewPath } from '../../../shared/workspace-view'
import {
  byLabel,
  byRole,
  queryByLabel,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_TIME } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  asMessageField,
  messageText,
  pasteMessage,
  typeMessage,
} from '../../../test-support/message-field'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { click, settle } from '../../test-mount'
import { bodiesOf, emit, here, id, messageField, org } from '../kept-test-kit'
import { linkTo } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const allFiles = filesHref(org, id, { kind: 'list', list: 'all' })
const form: FilesTarget = {
  kind: 'file',
  path: FAKE_FILE_PATH,
  mode: 'preview',
}
/** The mention of the chip of the file of `form`, as the draft keeps it. */
const formMention = `@${FAKE_FILE_PATH}`

/** The lists of the right column on desktop, or the Files tab of a phone. */
const lists = (view: HTMLElement) =>
  queryByLabel('Files and tools', view) ?? view

/** The link of a row of a list to `to`. */
function rowTo(view: HTMLElement, list: string, to: FilesTarget) {
  return linkTo(byLabel(list, lists(view)), filesHref(org, id, to))
}

/** The names of the items of the open menu of a row, and its lines. */
function shownMenu(name: string) {
  const items = menuItems(name).map((item) => item.name)
  return { items, lines: byRole('menu', name).querySelectorAll('hr').length }
}

/** Opens the menu of a row with a right click, as `shownMenu` gives it. */
function openMenu(row: HTMLElement, name: string) {
  rightClick(row, { clientX: 900, clientY: 200 })
  return shownMenu(name)
}

/** Presses Add to chat in the open menu, and lets the chat follow. */
async function addToChat() {
  await press(byRole('menuitem', 'Add to chat'))
  await settle()
}

/** The draft of the message field that shows, or null while none shows. */
function draftOf(view: HTMLElement): string | null {
  const field = queryByLabel('Message', view)
  return field ? messageText(asMessageField(field)) : null
}

/** Whether a message field shows and has the focus. */
function focusedField(view: HTMLElement): boolean {
  const field = queryByLabel('Message', view)
  return field !== null && document.activeElement === field
}

describe('Add to chat in the row menu of the Files panel', () => {
  test('on desktop, a file row offers Add to chat, a line, and Copy path, and Add to chat puts the chip at the caret of the shown session with a space after it, with the focus in the field after the chip', async () => {
    const { view, navigation } = await openPaletteTab(allFiles)
    const field = messageField(view)
    typeMessage(field, 'Look at please')
    selectText(field, 'Look at please', 'Look at '.length, 8)
    const menu = openMenu(rowTo(view, 'All files', form), 'AddressForm.tsx')
    await addToChat()
    const added = {
      draft: draftOf(view),
      focused: focusedField(view),
      address: navigation.href(),
    }
    pasteMessage(field, 'now ')
    expect({ menu, added, typed: draftOf(view) }).toEqual({
      menu: { items: ['Add to chat', 'Copy path'], lines: 1 },
      added: {
        draft: `Look at ${formMention} please`,
        focused: true,
        address: allFiles,
      },
      typed: `Look at ${formMention} now please`,
    })
  })

  test('on desktop, behind a file tab, Add to chat of a folder row shows the session that the member saw last, with the chip of the folder at the end of its draft and the focus in its field', async () => {
    const { view, navigation } = await openPaletteTab(allFiles)
    typeMessage(messageField(view), 'Look at')
    click(rowTo(view, 'All files', form))
    await settle()
    const behind = {
      address: navigation.href(),
      field: queryByLabel('Message', view),
    }
    openMenu(byRole('button', 'lib', byLabel('All files', lists(view))), 'lib')
    await addToChat()
    expect({
      behind,
      address: navigation.href(),
      draft: draftOf(view),
      focused: focusedField(view),
    }).toEqual({
      behind: { address: filesHref(org, id, form), field: null },
      address: here,
      draft: 'Look at @src/lib/ ',
      focused: true,
    })
  })

  test('with no open session tab, Add to chat starts a new session, and the chip goes into its field', async () => {
    const server = new FakeApiServer()
    const { sessions, view: saved } = workspaceFixtures()
    const fresh: Session = {
      ...sessions.sessions[0],
      id: 'fresh',
      title: null,
      createdAt: FAKE_TIME,
    }
    server.json('GET', sessionsPath(org, id), { ...sessions, sessions: [] })
    server.json('GET', workspaceViewPath(org, id), {
      view: { ...saved.view, tabs: [], activeTab: null },
    })
    const create = { session: fresh, eventNumber: 0 }
    server.json('POST', sessionsPath(org, id), create, 201)
    server.json('GET', chatHistoryPath(org, id, 'fresh'), {
      events: [],
      throughEventNumber: 0,
    })
    const { view } = await openPaletteTab(allFiles, { server })
    const before = queryByLabel('Message', view)
    openMenu(rowTo(view, 'All files', form), 'AddressForm.tsx')
    await addToChat()
    const creates = await bodiesOf(server, 'POST', sessionsPath(org, id), 0)
    expect({
      before,
      creates: creates.length,
      draft: draftOf(view),
      focused: focusedField(view),
    }).toEqual({
      before: null,
      creates: 1,
      draft: `${formMention} `,
      focused: true,
    })
  })

  test('on a phone, Add to chat switches from Files to the chat of the session that the member saw last, and its field takes no focus', async () => {
    const { view, navigation } = await openPaletteTab(allFiles, {
      viewport: 'phone',
    })
    const menu = openMenu(rowTo(view, 'All files', form), 'AddressForm.tsx')
    await addToChat()
    expect({
      menu,
      address: navigation.href(),
      draft: draftOf(view),
      focused: focusedField(view),
    }).toEqual({
      menu: { items: ['Add to chat', 'Copy path'], lines: 1 },
      address: here,
      draft: `${formMention} `,
      focused: false,
    })
  })

  test.each(['desktop', 'phone'] as const)(
    'on %s, leaves out Add to chat until the chat loads, and while the bar of a stopped cloud computer takes the place of the field, also in a menu that is open, and keeps Copy path focused and usable',
    async (viewport) => {
      // The chat shows a spinner while it loads, which would keep `act` busy.
      holdAnimationFrames()
      const server = new FakeApiServer()
      const held = new HeldRequests(server)
      held.holdAnswer('GET', sessionsPath(org, id))
      const copied: string[] = []
      const { view } = await openPaletteTab(allFiles, {
        server,
        fetch: held.fetch,
        viewport,
        copy: async (text) => {
          copied.push(await text)
        },
      })
      const loading = openMenu(
        rowTo(view, 'All files', form),
        'AddressForm.tsx',
      )
      await act(async () => held.release('GET', sessionsPath(org, id)))
      await settle()
      const loaded = shownMenu('AddressForm.tsx')
      act(() => byRole('menuitem', 'Add to chat').focus())
      expect(focused()).toBe('Add to chat')
      const { workspace } = workspaceFixtures().detail
      emit(server, {
        type: 'workspace.updated',
        workspace: { ...workspace, state: 'stopped' },
      })
      await settle()
      expect({
        loading,
        loaded,
        stopped: shownMenu('AddressForm.tsx'),
        field: queryByLabel('Message', view),
      }).toEqual({
        loading: { items: ['Copy path'], lines: 0 },
        loaded: { items: ['Add to chat', 'Copy path'], lines: 1 },
        stopped: { items: ['Copy path'], lines: 0 },
        field: null,
      })
      expect(focused()).toBe('Copy path')
      await pressKey('ArrowDown')
      const copyPath = byRole('menuitem', 'Copy path')
      expect(document.activeElement).toBe(copyPath)
      await press(copyPath)
      await settle()
      expect({ copied, menu: menuItems('AddressForm.tsx') }).toEqual({
        copied: [FAKE_FILE_PATH],
        menu: [],
      })
    },
  )

  test('leaves out Add to chat on a path that the list of @ does not offer, on a deleted file of Changes that the tree still holds, and on a changed file that the limited tree leaves out', async () => {
    const { server, view, navigation } = await openPaletteTab(allFiles)
    const quoted = '"draft".md'
    const deleted = 'src/app/checkout/postcodeLookup.ts'
    const omitted = 'src/app/checkout/useAddressAutocomplete.ts'
    // The tree and Changes come from their own reports, so the tree can
    // still hold a file that Changes lists as deleted. A limited tree can
    // leave out a file that Changes lists.
    const upsert = (path: string, name: string) => ({
      operation: 'upsert' as const,
      entry: { path, name, kind: 'file' as const, change: null },
    })
    emit(server, {
      type: 'files.changed',
      delta: {
        revision: 3,
        omittedEntryCount: 1,
        changes: [
          upsert(quoted, quoted),
          upsert(deleted, 'postcodeLookup.ts'),
          { operation: 'remove', path: omitted },
        ],
      },
    })
    await settle()
    const target: FilesTarget = { kind: 'file', path: quoted, mode: 'preview' }
    const unoffered = openMenu(rowTo(view, 'All files', target), quoted)
    await pressKey('Escape')
    const changes = filesHref(org, id, { kind: 'list', list: 'changes' })
    act(() => navigation.push(changes))
    await settle()
    const row = rowTo(view, 'Changed files', { kind: 'diff', path: deleted })
    const deletedMenu = openMenu(row, 'postcodeLookup.ts')
    await pressKey('Escape')
    const left = rowTo(view, 'Changed files', { kind: 'diff', path: omitted })
    expect({
      unoffered,
      deleted: deletedMenu,
      omitted: openMenu(left, 'useAddressAutocomplete.ts'),
    }).toEqual({
      unoffered: { items: ['Copy path'], lines: 0 },
      deleted: { items: ['Copy path'], lines: 0 },
      omitted: { items: ['Copy path'], lines: 0 },
    })
  })
})
