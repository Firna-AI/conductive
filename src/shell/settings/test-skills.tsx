import trustStyles from '../../ui/components/settings/SkillsTrust.module.css'
import { requestLines } from '../../app/test-kit'
import {
  orgSettingsPaths,
  type SkillsRepositoryLookupResponse,
} from '../../shared/org-settings'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { ComputerTab } from './ComputerTab'

/** The lookup route of the skills of Acme. */
export const skillsPath = orgSettingsPaths.skills(FAKE_IDS.org)

/** The settings route of Acme, which saves the skills repository. */
export const settingsPath = orgSettingsPaths.settings(FAKE_IDS.org)

/** A lookup of acme/agent-skills that found these skills, or a notice. */
export function lookup(
  fields: Partial<SkillsRepositoryLookupResponse>,
): SkillsRepositoryLookupResponse {
  return {
    repository: 'acme/agent-skills',
    skills: [],
    notice: null,
    clashes: [],
    ...fields,
  }
}

/**
 * The Cloud computer tab of Acme, for the person of the server. `overrides`
 * changes the services of the app, such as a fetch that holds requests.
 */
export async function mountedTab(
  server: FakeApiServer,
  overrides: Parameters<typeof startedApp>[1] = {},
): Promise<HTMLElement> {
  const app = await startedApp(server, overrides)
  const acme = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!acme) throw new Error('The fake org is missing.')
  const view = mountScreen(app, <ComputerTab org={acme} />)
  await settle()
  return view
}

/** The Skills section of the tab. */
export function skillsOf(view: HTMLElement): HTMLElement {
  const section = Array.from(view.querySelectorAll('section')).find(
    (item) => item.querySelector('h2')?.textContent === 'Skills',
  )
  if (!section) throw new Error('The Skills section is missing.')
  return section
}

/** The names in the list of skills, or `null` without a list. */
export function listed(view: HTMLElement): (string | null)[] | null {
  const list = queryByRole('list', 'Skills in the repository', view)
  return list
    ? Array.from(list.querySelectorAll('li'), (item) => item.textContent)
    : null
}

/** The Repository field of an admin. */
export function field(view: HTMLElement): HTMLInputElement {
  const input = byRole('textbox', 'Repository', view)
  if (!(input instanceof HTMLInputElement)) throw new Error('No field.')
  return input
}

/** Whether Save repository is off, also while it keeps the focus. */
export function saveOff(view: HTMLElement): boolean {
  const button = byRole('button', 'Save repository', view)
  if (!(button instanceof HTMLButtonElement)) throw new Error('No button.')
  return button.disabled || button.closest('[aria-disabled="true"]') !== null
}

/** The trust switch of an admin, which shows only while the field names a repository. */
function trustSwitch(view: HTMLElement): HTMLElement | null {
  return queryByRole('switch', 'Trust this skills repository', view)
}

/**
 * The trust choice that the section of an admin shows: whether the switch
 * is on, and the text of its hint, or `null` while the switch is hidden.
 */
export function trustOf(
  view: HTMLElement,
): { on: boolean; hint: string | null } | null {
  const control = trustSwitch(view)
  if (!control) return null
  const row = control.closest(`.${trustStyles.trust}`)
  return {
    on: control.getAttribute('aria-checked') === 'true',
    hint: row?.querySelector(`.${trustStyles.hint}`)?.textContent ?? null,
  }
}

/** The number of lookups of the skills that the server got. */
export function lookups(server: FakeApiServer): number {
  return requestLines(server).filter((line) => line === `GET ${skillsPath}`)
    .length
}

/** The bodies of the saves of the settings, in their order. */
export function settingsWrites(server: FakeApiServer): Promise<unknown[]> {
  const writes = server.requests.filter(
    (request) =>
      request.method === 'PATCH' &&
      new URL(request.url).pathname === settingsPath,
  )
  return Promise.all(writes.map((request) => request.clone().json()))
}
