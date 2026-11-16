import type { ComponentProps } from 'react'
import type { OpenAgentForm } from '../components/settings/AgentList'
import type { OrgAgentsTab } from '../components/settings/OrgAgents'
import type { ReadOnlyCause } from '../components/settings/OrgSections'
import { shareNotSavedCause, type AgentLogins } from '../fixtures/logins'
import { acmeOrgLogins, unlistedOrgLogins } from '../fixtures/orgLogins'
import { paths } from '../paths'
import type { OrgSettingsState } from './OrgSettingsScreen'

/**
 * The parts of the state of the org settings that the Agents tab shows,
 * from decisions 1 B and 7 B of the org logins plan.
 * `OrgSettingsScreen.tsx` adds them to the state of the screen.
 */
export const orgAgentsProperties = {
  /**
   * The org logins of Acme: Claude on the gateway of Acme, or also Codex
   * with an API key, after the Connect of Codex.
   */
  orgLogins: { enum: ['claude', 'both'] },
  /**
   * The last read of the model list of the gateway of Acme: it names every
   * model of the app, or it lacks Fable 5.1, which each picker on the org
   * login then hides (decision 3 A).
   */
  orgModels: { enum: ['listed', 'unlisted'] },
  /**
   * The open form of the Agents tab: none, the Connect form of Codex on API
   * key, on own endpoint, with an address that the shared rule refused, or
   * after a save that failed, or the form that Replace opens under the
   * Claude login.
   */
  agentForm: {
    enum: ['none', 'api-key', 'endpoint', 'refused', 'not-saved', 'replace'],
  },
  /**
   * The switch "Use for every member" under the Claude login of Acme: off,
   * as it starts, on, or a change to on that the app did not save.
   */
  everyMember: { enum: ['off', 'on', 'not-saved'] },
} as const

export const orgAgentsKeys = [
  'orgLogins',
  'orgModels',
  'agentForm',
  'everyMember',
] as const

/** Claude on the gateway of Acme, with no form open and the switch off. */
export const orgAgentsDefaults = {
  orgLogins: 'claude',
  orgModels: 'listed',
  agentForm: 'none',
  everyMember: 'off',
} as const

/** The org logins of a state. */
function loginsOf(state: OrgSettingsState): AgentLogins {
  const claude =
    state.orgModels === 'unlisted' ? unlistedOrgLogins : acmeOrgLogins
  return state.orgLogins === 'both'
    ? { ...claude, codex: { kind: 'api-key' } }
    : claude
}

/**
 * The open form of a state. Connect of Codex leads to both logins
 * connected, and Replace leads back to the tab.
 */
function formOf(state: OrgSettingsState): OpenAgentForm | undefined {
  const codex = {
    agent: 'codex',
    connectTo: paths.orgAgentsConnected,
    cancel: true,
  } as const
  switch (state.agentForm) {
    case 'none':
      return undefined
    case 'api-key':
      return { ...codex, kind: 'api-key' }
    case 'endpoint':
      return { ...codex, endpoint: 'empty' }
    case 'refused':
      return { ...codex, endpoint: 'refused' }
    case 'not-saved':
      return { ...codex, kind: 'api-key', failed: shareNotSavedCause }
    case 'replace':
      return {
        agent: 'claude',
        endpoint: 'empty',
        connectTo: paths.orgAgents,
        cancel: true,
        replace: true,
      }
  }
}

/** The Agents tab of the org settings in a state. */
export function orgAgentsFor(
  state: OrgSettingsState,
  org: string,
  readOnly: ReadOnlyCause | undefined,
): ComponentProps<typeof OrgAgentsTab> {
  return {
    org,
    logins: loginsOf(state),
    form: formOf(state),
    everyMember: {
      on: state.everyMember === 'on' ? ['claude'] : [],
      notSaved: state.everyMember === 'not-saved' ? 'claude' : null,
    },
    readOnly,
    links: {
      connectTo: paths.orgAgentsForm,
      replaceTo: paths.orgAgentsReplace,
    },
  }
}
