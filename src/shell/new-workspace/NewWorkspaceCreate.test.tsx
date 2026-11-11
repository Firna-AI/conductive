// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { FetchLike } from '../../app/api/client'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { attachmentPath } from '../../shared/attachment-paths'
import { mentionText } from '../../shared/mention-text'
import { attachmentUploadPath } from '../../shared/messages'
import { workspacesPath } from '../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { pickFiles } from '../../test-support/file-picker'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { messageText } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import {
  away,
  bodiesOf,
  headerName,
  isOff,
  org,
} from '../workspace/kept-test-kit'
import {
  createCount,
  dialogIn,
  focusIn,
  keyDown,
  mainOf,
  markOf,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const task = 'Let shoppers save their cart.'
const unreachable = "The app can't reach the server. Your message is kept."
const { created } = workspaceFixtures()
const createdAt = routes.workspace(org, created.workspace.id)

describe('a create from the New workspace dialog', () => {
  test('that fails keeps the dialog with the message and Try again, and Try again creates the workspace in the section of the menu and opens it, whose main area takes the focus', async () => {
    const server = serverWith('dialog')
    let reachable = false
    // The create request does not reach the server until the test says so.
    const fetch: FetchLike = (input, init) => {
      const create =
        init?.method === 'POST' &&
        new URL(input, FAKE_ORIGIN).pathname === workspacesPath(org)
      if (create && !reachable) return Promise.reject(new TypeError('offline'))
      return server.fetch(input, init)
    }
    const tab = await openTab(server, { fetch })
    const more = byLabel('More for Checkout', sidebarOf(tab.view))
    click(more)
    click(byRole('menuitem', 'New workspace', sidebarOf(tab.view)))
    await settle()
    typeText(messageIn(openDialog(tab.view)), task)
    click(byRole('button', 'Create', openDialog(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    expect({
      title: queryByText("The workspace wasn't created", dialog) !== null,
      body: queryByText(unreachable, dialog) !== null,
      text: messageText(messageIn(dialog)),
      tryAgain: queryByRole('button', 'Try again', dialog) !== null,
    }).toEqual({ title: true, body: true, text: task, tryAgain: true })
    reachable = true
    click(byRole('button', 'Try again', dialog))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    expect({
      sent,
      dialog: dialogIn(tab.view),
      address: tab.address(),
      header: headerName(tab.view),
      focusBack: document.activeElement === more,
      focusInMain: focusIn(mainOf(tab.view)),
    }).toEqual({
      sent: expect.objectContaining({
        sectionId: 'checkout',
        firstMessage: expect.objectContaining({ text: task }),
      }),
      dialog: null,
      address: createdAt,
      header: 'Untitled',
      focusBack: false,
      focusInMain: true,
    })
  })

  test('goes on when the address changes while it runs, which closes the dialog and gives the focus to the main area of the new screen, also of Create org, and the accepted create opens the new workspace', async () => {
    const server = serverWith('dialog')
    const held = new HeldRequests(server)
    const tab = await openTab(server, { fetch: held.fetch })
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    typeText(messageIn(openDialog(tab.view)), task)
    held.hold('POST', workspacesPath(org))
    click(byRole('button', 'Create', openDialog(tab.view)))
    await settle()
    // While the create runs, Escape and a press outside keep the dialog.
    press(messageIn(openDialog(tab.view)), 'Escape')
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    await settle()
    const running = dialogIn(tab.view) !== null
    await tab.go(away)
    const closed = {
      dialog: dialogIn(tab.view),
      address: tab.address(),
      focusInMain: focusIn(mainOf(tab.view)),
    }
    held.release('POST', workspacesPath(org))
    await settle()
    expect({
      running,
      closed,
      address: tab.address(),
      header: headerName(tab.view),
      creates: createCount(server),
    }).toEqual({
      running: true,
      closed: { dialog: null, address: away, focusInMain: true },
      address: createdAt,
      header: 'Untitled',
      creates: 1,
    })
    // Create org stands alone, without the rail, as after Back to it.
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const reopened = dialogIn(tab.view) !== null
    await tab.go(routes.createOrg())
    const main = tab.view.querySelector('main')
    expect({
      reopened,
      dialog: dialogIn(tab.view),
      address: tab.address(),
      focusInMain: main?.contains(document.activeElement) ?? false,
    }).toEqual({
      reopened: true,
      dialog: null,
      address: routes.createOrg(),
      focusInMain: true,
    })
  })
})

describe('the send key of New workspace', () => {
  test.each([
    {
      form: 'page',
      where: 'on the page',
      open: async (tab: Awaited<ReturnType<typeof openTab>>) => {
        await tab.go(routes.newWorkspace(org))
        return mainOf(tab.view)
      },
    },
    {
      form: 'dialog',
      where: 'in the dialog',
      open: async (tab: Awaited<ReturnType<typeof openTab>>) => {
        click(newWorkspaceRow(sidebarOf(tab.view)))
        await settle()
        return openDialog(tab.view)
      },
    },
  ] as const)(
    '$where, Enter waits for uploads and creates with their IDs. Shift+Enter, input method composition, and an empty message keep the draft.',
    async ({ form, open }) => {
      const server = serverWith(form)
      const held = new HeldRequests(server)
      const tab = await openTab(server, { fetch: held.fetch })
      const root = await open(tab)
      const field = messageIn(root)
      // The field adds the line of Shift+Enter itself, so it keeps the key
      // from the browser. The text shows each line that a key added.
      const keys = async (init: KeyboardEventInit) => {
        const kept = keyDown(field, { key: 'Enter', ...init })
        await settle()
        const text = field.isConnected ? messageText(field) : null
        return { kept, creates: createCount(server), text }
      }
      const empty = await keys({})
      typeText(field, task)
      const shift = await keys({ shiftKey: true })
      const composing = await keys({ isComposing: true })
      const draft = tab.app.org(org).newWorkspace(null)
      const uploadPath = attachmentUploadPath(org, {
        type: 'new-workspace',
        messageId: draft.draft.get().messageId,
      })
      server.json(
        'POST',
        uploadPath,
        {
          error: { code: 'upload_failed', message: 'The upload failed.' },
        },
        502,
      )
      held.holdAnswer('POST', uploadPath)
      await pickFiles(root, [
        new File(['png'], 'postcode-overlap.png', { type: 'image/png' }),
      ])
      await settle()
      // The chip goes to the caret, on the line that Shift+Enter added.
      const withChip = `${task}\n${markOf(draft, 'postcode-overlap.png')} `
      const uploading = await keys({})
      expect(uploading).toEqual({ kept: true, creates: 0, text: withChip })
      const sendOff = isOff(
        byRole('button', form === 'page' ? 'Send' : 'Create', root),
      )
      held.release('POST', uploadPath)
      await settle()
      const failed = await keys({})
      expect(failed).toEqual({ kept: true, creates: 0, text: withChip })
      const uploaded = {
        id: 'draft-attachment-1',
        name: 'postcode-overlap.png',
      }
      const path = await attachmentPath(uploaded)
      server.json(
        'POST',
        uploadPath,
        {
          attachment: {
            ...uploaded,
            path,
            kind: 'image',
            mediaType: 'image/png',
            sizeBytes: 3,
          },
        },
        201,
      )
      click(byLabel('Upload postcode-overlap.png again', root))
      await settle()
      const enter = await keys({})
      const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
      expect({
        empty,
        shift,
        composing,
        sendOff,
        enter,
        sent,
        address: tab.address(),
      }).toEqual({
        empty: { kept: true, creates: 0, text: '' },
        shift: { kept: true, creates: 0, text: `${task}\n` },
        composing: { kept: false, creates: 0, text: `${task}\n` },
        sendOff: true,
        enter: { kept: true, creates: 1, text: null },
        sent: expect.objectContaining({
          firstMessage: expect.objectContaining({
            text: `${task}\n${mentionText(path, false)} `,
            attachmentIds: ['draft-attachment-1'],
          }),
        }),
        address: createdAt,
      })
    },
  )
})
