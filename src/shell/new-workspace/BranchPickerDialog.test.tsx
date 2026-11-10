// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { workspacesPath } from '../../shared/workspaces'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { bodiesOf, org } from '../workspace/kept-test-kit'
import {
  branchRows,
  pageOf,
  pickerRows,
  searchField,
  serverWithBranches,
} from './branch-test-kit'
import {
  createCount,
  dialogIn,
  keyDown,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  placeOf,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const task = 'Let shoppers pay with gift cards.'
const choice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
} as const

/** The parts of the form that no branch operation may change. */
function formOf(model: NewWorkspaceModel) {
  const draft = model.draft.get()
  return {
    text: draft.text,
    files: draft.files.map((file) => `${file.file.name} ${file.state}`),
    choice: draft.choice,
    messageId: draft.messageId,
  }
}

describe('the branch picker of the New workspace dialog', () => {
  test('the control beside the repository opens the picker, Enter in its search finds a pull request and sends no message, Escape closes only the picker, and the chosen pull request names the control, keeps the form, and goes with Create', async () => {
    const server = serverWithBranches('dialog')
    server.json('GET', pageOf('gift'), {
      rows: branchRows.slice(0, 1),
      nextCursor: null,
    })
    const tab = await openTab(server)
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    typeText(messageIn(dialog), task)
    const draft = tab.app.org(org).newWorkspace(null)
    act(() => draft.setChoice(choice))
    await act(() =>
      draft.attach([new File(['png'], 'gift-card.png', { type: 'image/png' })]),
    )
    const before = formOf(draft)
    const control = byRole('button', 'Branch: New branch', dialog)
    click(control)
    await settle()
    const field = searchField(dialog)
    typeText(field, 'gift')
    keyDown(field, { key: 'Enter' })
    await settle()
    const found = { rows: pickerRows(dialog), creates: createCount(server) }
    press(field, 'Escape')
    await settle()
    const escaped = {
      picker: queryByRole('menu', 'Branch', dialog),
      dialog: dialogIn(tab.view) !== null,
      focus: document.activeElement === control,
    }
    click(control)
    await settle()
    const reopened = {
      search: searchField(dialog).value,
      rows: pickerRows(dialog),
    }
    click(byRole('menuitemradio', '#486 Gift cards at checkout', dialog))
    await settle()
    const named =
      queryByRole('button', 'Branch: #486 Gift cards at checkout', dialog) !==
      null
    const kept = { form: formOf(draft), place: placeOf(dialog) }
    click(byRole('button', 'Create', dialog))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    expect({ found, escaped, reopened, named, kept, sent }).toEqual({
      found: {
        rows: ['New branch, from main ✓', '#486 Gift cards at checkout'],
        creates: 0,
      },
      escaped: { picker: null, dialog: true, focus: true },
      reopened: {
        search: 'gift',
        rows: ['New branch, from main ✓', '#486 Gift cards at checkout'],
      },
      named: true,
      kept: {
        form: {
          text: task,
          files: ['gift-card.png ready'],
          choice,
          messageId: before.messageId,
        },
        place: 'Acme · General',
      },
      sent: {
        repositoryId: 'storefront',
        branch: { type: 'existing', name: 'priyaraman/gift-cards' },
        firstMessage: {
          id: before.messageId,
          text: task,
          attachmentIds: ['draft-attachment-1'],
          choice,
        },
      },
    })
  })
})
