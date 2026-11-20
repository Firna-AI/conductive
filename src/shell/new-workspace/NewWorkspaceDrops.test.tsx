// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import {
  layOutPoint,
  textNode,
} from '../../chat/components/chip-field/attached-field-events'
import { attachmentPath } from '../../shared/attachment-paths'
import { attachmentUploadCompletePath } from '../../shared/messages'
import { workspacesPath } from '../../shared/workspaces'
import { byRole } from '../../test-support/dom-queries'
import { draggedFiles, dropOn, fireDrag } from '../../test-support/file-drop'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import composerStyles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import dialogStyles from '../../../docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css'
import { click, settle, typeText } from '../test-mount'
import { org } from '../workspace/kept-test-kit'
import {
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
const png = (name: string) => new File(['png'], name, { type: 'image/png' })

/** The left edge of the drop caret of the field, or null while it hides. */
const dropCaret = () =>
  document.querySelector<HTMLElement>('[data-drop-caret]')?.style.left ?? null

/** The words of each notice that names a problem, as a person reads them. */
const notices = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[role="alert"]'), (notice) =>
    (notice.textContent ?? '').trim(),
  )

describe('a drop of files on New workspace', () => {
  test('on the page, a drop on the text puts the files at the place under the pointer, and while the create runs the box shows no drop state and no drop caret, also for files that hovered over the text as it began, offers no drop, and takes none', async () => {
    const server = serverWith('page')
    const held = new HeldRequests(server)
    const tab = await openTab(server, { fetch: held.fetch })
    await tab.go(routes.newWorkspace(org))
    const root = mainOf(tab.view)
    const field = messageIn(root)
    typeText(field, task)
    const draft = tab.app.org(org).newWorkspace(null)
    const completePath = attachmentUploadCompletePath(
      org,
      { type: 'new-workspace', messageId: draft.draft.get().messageId },
      FAKE_IDS.upload,
    )
    const uploaded = { id: 'draft-attachment-1', name: 'cart.png' }
    const attachment = {
      ...uploaded,
      path: await attachmentPath(uploaded),
      kind: 'image',
      mediaType: 'image/png',
      sizeBytes: 3,
    }
    server.json('POST', completePath, { attachment }, 201)
    const point = layOutPoint({
      over: field,
      node: textNode(field, task),
      offset: 'Let shoppers '.length,
    })
    const drop = dropOn(field, draggedFiles([png('cart.png')]), point)
    await settle()
    const dropped = {
      taken: drop.defaultPrevented,
      text: draft.draft.get().text,
    }
    const box = field.closest(`.${composerStyles.composer}`)
    const isDropping = () => box?.classList.contains(composerStyles.dropping)
    // Files hover over the text when the create starts.
    const over = layOutPoint({
      over: field,
      node: textNode(field, 'save their cart.'),
      offset: 0,
      box: new DOMRect(48, 0, 0, 18),
    })
    const late = draggedFiles([png('late.png')])
    fireDrag(field, 'dragenter', late, { point: over })
    fireDrag(field, 'dragover', late, { point: over })
    const hover = { dropping: isDropping(), caret: dropCaret() }
    held.hold('POST', workspacesPath(org))
    click(byRole('button', 'Send', root))
    await settle()
    // No drag event comes between the start of the create and this check.
    const started = {
      creating: draft.create.get().state,
      dropping: isDropping(),
      caret: dropCaret(),
    }
    const moved = fireDrag(field, 'dragover', late, { point: over })
    const blocked = {
      creating: draft.create.get().state,
      dropping: isDropping(),
      taken: moved.defaultPrevented,
      offer: late.dropEffect,
      caret: dropCaret(),
    }
    const lateDrop = fireDrag(field, 'drop', late, { point: over })
    const after = {
      taken: lateDrop.defaultPrevented,
      files: draft.draft.get().files.map(({ file }) => file.name),
      text: draft.draft.get().text,
    }
    // The draft starts again after the create, so the mark is read first.
    const mark = markOf(draft, 'cart.png')
    held.release('POST', workspacesPath(org))
    await settle()
    expect({ dropped, hover, started, blocked, after }).toEqual({
      dropped: { taken: true, text: `Let shoppers ${mark} save their cart.` },
      hover: { dropping: true, caret: '48px' },
      started: { creating: 'sending', dropping: false, caret: null },
      blocked: {
        creating: 'sending',
        dropping: false,
        taken: true,
        offer: 'none',
        caret: null,
      },
      after: {
        taken: true,
        files: ['cart.png'],
        text: `Let shoppers ${mark} save their cart.`,
      },
    })
  })

  test('in the dialog, files over the card show its drop state, and a drop on the card puts the files and the zip of a dropped folder at the caret, and names a folder that cannot be read in the notices of the dialog', async () => {
    const server = serverWith('dialog')
    const tab = await openTab(server)
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    typeText(messageIn(dialog), task)
    const data = draggedFiles([
      png('cart.png'),
      { folder: 'checkout-screens', items: [png('overlap.png')] },
      { folder: 'private', unreadable: true },
    ])
    fireDrag(dialog, 'dragenter', data)
    const over = fireDrag(dialog, 'dragover', data)
    const hover = {
      dropping: dialog.classList.contains(dialogStyles.dropping),
      taken: over.defaultPrevented,
      offer: data.dropEffect,
    }
    const drop = fireDrag(dialog, 'drop', data)
    await settle()
    const draft = tab.app.org(org).newWorkspace(null)
    expect({
      hover,
      dropped: {
        taken: drop.defaultPrevented,
        dropping: dialog.classList.contains(dialogStyles.dropping),
        text: draft.draft.get().text,
        files: draft.draft.get().files.map(({ file }) => file.name),
        notices: notices(dialog),
      },
    }).toEqual({
      hover: { dropping: true, taken: true, offer: 'copy' },
      dropped: {
        taken: true,
        dropping: false,
        text: `${task} ${markOf(draft, 'cart.png')} ${markOf(draft, 'checkout-screens.zip')} `,
        files: ['cart.png', 'checkout-screens.zip'],
        notices: [
          "private wasn't attachedThe folder couldn't be read. Attach the files in it instead.Attach files",
        ],
      },
    })
  })
})
