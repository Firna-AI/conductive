// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { orgSettingsPaths } from '../../shared/org-settings'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { isOff, org } from '../workspace/kept-test-kit'
import {
  createCount,
  dialogIn,
  keyDown,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

test('before the first good build, Create and Enter keep the draft, and Open Cloud computer closes the dialog', async () => {
  const server = serverWith('dialog')
  server.json('GET', orgSettingsPaths.builds(org), {
    builds: [],
    currentImageBuildId: null,
  })
  const tab = await openTab(server)
  click(newWorkspaceRow(sidebarOf(tab.view)))
  await settle()
  const dialog = openDialog(tab.view)
  const field = messageIn(dialog)
  const task = 'Let shoppers save their cart.'
  typeText(field, task)
  const create = byRole('button', 'Create', dialog)
  expect({
    createOff: isOff(create),
    notice: queryByText('The cloud computer needs a build', dialog) !== null,
  }).toEqual({ createOff: true, notice: true })
  click(create)
  keyDown(field, { key: 'Enter' })
  await settle()
  expect({ creates: createCount(server), text: field.value }).toEqual({
    creates: 0,
    text: task,
  })
  click(byRole('button', 'Open Cloud computer', dialog))
  await settle()
  expect({
    dialog: dialogIn(tab.view),
    address: tab.address(),
    draft: tab.app.org(org).newWorkspace(null).draft.get().text,
  }).toEqual({
    dialog: null,
    address: routes.settings(org, 'cloud-computer'),
    draft: task,
  })
})
