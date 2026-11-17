import {
  orgSettingsPaths,
  type SkillsRepositoryLookupResponse,
} from '../../shared/org-settings'
import { queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { ComputerTab } from './ComputerTab'

/** The lookup route of the skills of Acme. */
export const skillsPath = orgSettingsPaths.skills(FAKE_IDS.org)

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

/** The Cloud computer tab of Acme, for the person of the server. */
export async function mountedTab(server: FakeApiServer): Promise<HTMLElement> {
  const app = await startedApp(server)
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
