// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import {
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import { fakeWorkers } from '../../../files/mount-test-kit'
import type { FilesTab } from '../../../files/navigation'
import { nameLabel } from '../../../shared/name-label'
import type { SkillIdentity } from '../../../shared/skills'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../test-support/mount'
import { click, press as pressKey, settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { bodiesOf } from '../kept-test-kit'
import { linkTo, openTab, tabNames } from '../wiring-test-kit'
import { skillHref } from './skill-address'
import {
  plans,
  plansBody,
  plansDescription,
  plansText,
  serveSkillChat,
  serveSkillReads,
  textReply,
} from './skill-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.tabs
const [autocomplete, debounce] = workspaceFixtures().sessions.sessions.map(
  (session) => nameLabel(session.title),
)
const formDiff: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }

/** The workspace with a sent message that names `plans`, at its address. */
async function openChat() {
  holdAnimationFrames()
  const workers = fakeWorkers()
  const server = new FakeApiServer()
  serveSkillChat(server)
  serveSkillReads(server, plans, [textReply(plansText)])
  const tab = await openTab(server, routes.workspace(org, id))
  return { ...tab, server, workers }
}

/** Presses the skill chip `plans` of the sent message, in the chat. */
async function pressChip(view: HTMLElement) {
  click(linkTo(byLabel('Chat', view), skillHref(org, id, plans)))
  await settle()
}

/** Presses the row of `AddressForm.tsx` in Changes, which opens its diff. */
function pressChangedFile(view: HTMLElement) {
  const changes = byLabel('Changed files', byLabel('Files and tools', view))
  click(linkTo(changes, filesHref(org, id, formDiff)))
}

/** The link of the tab row to the skill tab of `skill`. */
const tabOf = (view: HTMLElement, skill: SkillIdentity) =>
  linkTo(byLabel('Sessions and files', view), skillHref(org, id, skill))

/** The text of the page of the skill tab of `plans`. */
const pageText = (view: HTMLElement) =>
  byRole('region', 'plans', view).textContent

/** The view that the switch of the page of `plans` marks: Preview or Source. */
const shownView = (view: HTMLElement) =>
  ['Preview', 'Source'].find(
    (name) =>
      byRole('radio', name, byRole('region', 'plans', view)).getAttribute(
        'aria-checked',
      ) === 'true',
  )

describe('the skill tab in the workspace', () => {
  test('a press on a skill chip of a sent message opens the skill in the temporary tab at its address, with the header of the skill and the Markdown body without the front matter, and the save carries the tab in the skill fields', async () => {
    const { view, navigation, server, workers } = await openChat()
    const from = server.requests.length

    await pressChip(view)
    const parse = await waitFor(() => workers.live()[0], 'the parse')
    const posted = parse.posted.at(-1)
    parse.answer()
    await settle()

    expect({
      names: tabNames(view),
      address: navigation.href(),
      posted,
      heading: byRole('region', 'plans', view).querySelector('h1')?.textContent,
      header: pageText(view)?.startsWith(
        `plansClaude skill${plansDescription}`,
      ),
      saved: (
        await bodiesOf(server, 'PUT', workspaceViewPath(org, id), from)
      ).at(-1),
    }).toEqual({
      names: [autocomplete, debounce, 'plans, temporary'],
      address: skillHref(org, id, plans),
      posted: plansBody,
      heading: 'Plans',
      header: true,
      saved: {
        tabs: [first, second],
        activeTab: null,
        temporaryTab: null,
        skillTabs: [{ ...plans, place: 2 }],
        activeSkill: plans,
        temporarySkill: plans,
        fileList: 'changes',
        tool: 'terminal',
        previewTabs: [],
        activePreview: null,
      },
    })
  })

  test('Source shows the whole text with its line count and stays after a visit to a session, a double-click keeps the tab, and the next press on a file opens a new temporary tab', async () => {
    const { view } = await openChat()
    await pressChip(view)
    click(byRole('radio', 'Source', byRole('region', 'plans', view)))
    await settle()
    const source = pageText(view)

    click(byRole('button', autocomplete, byLabel('Sessions and files', view)))
    await settle()
    click(tabOf(view, plans))
    await settle()
    const back = pageText(view)
    const double = { bubbles: true, cancelable: true, button: 0, detail: 2 }
    tabOf(view, plans).dispatchEvent(new MouseEvent('dblclick', double))
    await settle()
    const kept = tabNames(view)
    pressChangedFile(view)
    await settle()

    expect({
      source: source?.includes('8 lines') && source.includes('name: plans'),
      back: back?.includes('name: plans'),
      kept,
      names: tabNames(view),
    }).toEqual({
      source: true,
      back: true,
      kept: [autocomplete, debounce, 'plans'],
      names: [
        autocomplete,
        debounce,
        'plans',
        'AddressForm.tsx changes, temporary',
      ],
    })
  })

  test('the tab menu of the temporary skill tab has Keep open, the moves, and the closes, with no Copy path, and Keep open keeps the tab in its place', async () => {
    const { view } = await openChat()
    await pressChip(view)
    rightClick(tabOf(view, plans), { clientX: 150, clientY: 12 })
    expect(menuItems('plans')).toEqual([
      { name: 'Keep open', off: false },
      { name: 'Move left', off: false },
      { name: 'Move right', off: true },
      { name: 'Close other tabs', off: false },
      { name: 'Close tabs to the right', off: true },
    ])
    await press(byRole('menuitem', 'Keep open'))
    await settle()
    const kept = tabNames(view)
    rightClick(tabOf(view, plans), { clientX: 150, clientY: 12 })

    expect({ kept, keptMenu: menuItems('plans') }).toEqual({
      kept: [autocomplete, debounce, 'plans'],
      keptMenu: [
        { name: 'Move left', off: false },
        { name: 'Move right', off: true },
        { name: 'Close other tabs', off: false },
        { name: 'Close tabs to the right', off: true },
      ],
    })
  })

  test('Escape from the page closes the shown temporary skill tab as its Close does, and the chat shows', async () => {
    const { view, navigation } = await openChat()
    await pressChip(view)
    const opened = tabNames(view)
    pressKey(byRole('region', 'plans', view), 'Escape')
    await settle()

    expect({
      opened,
      closed: tabNames(view),
      address: navigation.href(),
    }).toEqual({
      opened: [autocomplete, debounce, 'plans, temporary'],
      closed: [autocomplete, debounce],
      address: routes.workspace(org, id),
    })
  })

  test('a press on a file replaces the temporary skill tab in its place', async () => {
    const { view } = await openChat()
    await pressChip(view)
    pressChangedFile(view)
    await settle()

    expect(tabNames(view)).toEqual([
      autocomplete,
      debounce,
      'AddressForm.tsx changes, temporary',
    ])
  })

  test('on a phone, a skill in Source whose temporary tab a diff replaced opens again in Preview', async () => {
    holdAnimationFrames()
    fakeWorkers()
    const server = new FakeApiServer()
    serveSkillChat(server)
    serveSkillReads(server, plans, [textReply(plansText)])
    const address = skillHref(org, id, plans)
    const { view, navigation } = await openTab(server, address, {
      viewport: 'phone',
    })
    click(byRole('radio', 'Source', byRole('region', 'plans', view)))
    await settle()
    const before = shownView(view)
    const from = server.requests.length

    act(() => navigation.push(filesHref(org, id, formDiff)))
    await settle()
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      from,
    )
    act(() => navigation.push(address))
    await settle()

    expect({ before, replaced: saved.at(-1), after: shownView(view) }).toEqual({
      before: 'Source',
      replaced: expect.objectContaining({
        temporaryTab: formDiff,
        skillTabs: [],
      }),
      after: 'Preview',
    })
  })
})
