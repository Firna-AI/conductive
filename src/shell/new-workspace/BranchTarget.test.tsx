// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { away, bodiesOf, org } from '../workspace/kept-test-kit'
import {
  branchesPath,
  pickBranch,
  picked,
  reads,
  rowOf,
  rowsIn,
  serveBranches,
  targetsIn,
  task,
} from './branch-test-kit'
import {
  mainOf,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const createPath = workspacesPath(org)
const stacks = 'The pull request holds only the new work.'
const holdsPicked = `The pull request also holds the commits of the branch ${picked}.`

describe('the Target part of the branch dropdown', () => {
  test('follows Start from for a picked branch, with that branch checked first, and a press on main closes the dropdown on a control that adds → main, a target that another pick keeps for the create', async () => {
    const server = serverWith('page')
    serveBranches(server)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    typeText(messageIn(main), task)
    await pickBranch(main, 'main', picked)
    click(byRole('button', `Branch: ${picked}`, main))
    await settle()
    const stacked = {
      checked: rowsIn(main).filter((row) => row.endsWith('✓')),
      targets: targetsIn(main),
      line: queryByText(stacks, main) !== null,
    }
    click(byRole('radio', 'main', main))
    await settle()
    const control = byRole('button', `Branch: ${picked}, target main`, main)
    const targeted = {
      dropdown: queryByRole('combobox', 'Search branches', main),
      focus: document.activeElement === control,
      text: control.textContent,
    }
    click(control)
    await settle()
    const reopened = {
      targets: targetsIn(main),
      line: queryByText(holdsPicked, main) !== null,
    }
    click(rowOf(main, 'develop'))
    await settle()
    const kept = queryByRole('button', 'Branch: develop, target main', main)
    click(byRole('button', 'Send', main))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', createPath, 0)
    expect({
      stacked,
      targeted,
      reopened,
      kept: kept?.textContent ?? null,
    }).toEqual({
      stacked: {
        checked: [`${picked} 2h ✓`],
        targets: [`${picked} ✓`, 'main'],
        line: true,
      },
      targeted: { dropdown: null, focus: true, text: `${picked}→ main` },
      reopened: { targets: [picked, 'main ✓'], line: true },
      kept: 'develop→ main',
    })
    expect(sent).toMatchObject({
      repositoryId: 'storefront',
      startBranch: 'develop',
      baseBranch: 'main',
      firstMessage: { text: task },
    })
  })

  test('chooses the target in the dropdown of the dialog, which shares the branch of the draft, and a change of repository puts the control back on its default branch without a target, as a muted icon with no text', async () => {
    const server = serverWith('dialog')
    serveBranches(server)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    await pickBranch(mainOf(tab.view), 'main', picked)
    await tab.go(away)
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    click(byRole('button', `Branch: ${picked}`, dialog))
    await settle()
    const shared = targetsIn(dialog)
    click(byRole('radio', 'main', dialog))
    await settle()
    const control = queryByRole(
      'button',
      `Branch: ${picked}, target main`,
      dialog,
    )
    const targeted = {
      dropdown: queryByRole('combobox', 'Search branches', dialog),
      text: control?.textContent ?? null,
    }
    click(byRole('button', 'Repository: acme/storefront', dialog))
    const menu = byRole('menu', 'Repository', dialog)
    click(byRole('menuitemradio', 'acme/billing-service', menu))
    await settle()
    expect({
      shared,
      targeted,
      changed: byRole('button', 'Branch: main', dialog).textContent,
    }).toEqual({
      shared: [`${picked} ✓`, 'main'],
      targeted: { dropdown: null, text: `${picked}→ main` },
      changed: '',
    })
  })

  test('shows in the sheet of a phone, where a failed read offers Try again that loads the list, a pick closes the sheet, and a press on main in the Target part closes it on that target', async () => {
    const server = serverWith('page')
    server.json(
      'GET',
      branchesPath,
      { error: { code: 'github_unavailable', message: 'GitHub is down.' } },
      502,
    )
    const tab = await openTab(server, {
      at: routes.newWorkspace(org),
      viewport: 'phone',
    })
    click(byRole('button', 'Branch: main', tab.view))
    await settle()
    const sheet = byRole('dialog', 'Branch', document.body)
    const failed = {
      startFrom: queryByRole('group', 'Start from', sheet) !== null,
      rows: rowsIn(sheet),
      notice: queryByText("The branches didn't load", sheet) !== null,
      targets: targetsIn(sheet),
    }
    serveBranches(server)
    click(byRole('button', 'Try again', sheet))
    await settle()
    const loaded = { rows: rowsIn(sheet).length, reads: reads(server) }
    click(rowOf(sheet, picked))
    await settle()
    const picks = queryByRole('dialog', 'Branch', document.body)
    click(byRole('button', `Branch: ${picked}`, tab.view))
    await settle()
    const again = byRole('dialog', 'Branch', document.body)
    const targets = targetsIn(again)
    click(byRole('radio', 'main', again))
    await settle()
    const control = queryByRole(
      'button',
      `Branch: ${picked}, target main`,
      tab.view,
    )
    expect({
      failed,
      loaded,
      picks,
      targets,
      chosen: {
        sheet: queryByRole('dialog', 'Branch', document.body),
        text: control?.textContent ?? null,
      },
    }).toEqual({
      failed: {
        startFrom: true,
        rows: ['main default ✓'],
        notice: true,
        targets: null,
      },
      loaded: { rows: 4, reads: 2 },
      picks: null,
      targets: [`${picked} ✓`, 'main'],
      chosen: { sheet: null, text: `${picked}→ main` },
    })
  })
})
