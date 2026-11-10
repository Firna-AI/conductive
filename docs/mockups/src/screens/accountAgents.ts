import type { ComponentProps } from 'react'
import type {
  AgentsSection,
  OpenAgentForm,
} from '../components/settings/AccountSections'
import type { UnusableLogin } from '../components/settings/LoginNotUsable'
import { agentKeys, type AgentKey } from '../fixtures/agents'
import {
  accountLogins,
  codexUnusableCause,
  type AgentLogins,
  type LoginKind,
} from '../fixtures/logins'
import { paths } from '../paths'
import type { AccountState } from './AccountScreen'

type FormKey = Exclude<AccountState['form'], 'none'>

/**
 * The agent of each form and the kind that its switch selects, and where
 * its main button leads. Connect leads to the account with that agent
 * connected by that kind. Each button of the ChatGPT sign-in that gets a
 * code leads to the page that shows the code and waits for the sign-in.
 */
const openForms: Readonly<Record<FormKey, OpenAgentForm>> = {
  claude: {
    agent: 'claude',
    kind: 'token',
    connectTo: paths.account,
    cancel: true,
  },
  'claude-api-key': {
    agent: 'claude',
    kind: 'api-key',
    connectTo: paths.account,
    cancel: true,
  },
  codex: {
    agent: 'codex',
    kind: 'api-key',
    connectTo: paths.account,
    cancel: true,
  },
  'codex-token': {
    agent: 'codex',
    kind: 'token',
    connectTo: paths.connectCodexChatGptCode,
    cancel: true,
  },
}

/** The logins of the agents in a state, without the agent of the form. */
function loginsFor(state: AccountState): AgentLogins {
  const logins: Partial<Record<AgentKey, LoginKind>> = {}
  if (state.connections === 'not-connected') return logins
  const kinds = { ...accountLogins, codex: state.codexLogin }
  const formAgent = state.form === 'none' ? null : openForms[state.form].agent
  for (const key of agentKeys) {
    if (key !== formAgent) logins[key] = kinds[key]
  }
  return logins
}

/** A Codex login that the app can no longer use, in a state. */
function unusableFor(state: AccountState): UnusableLogin | undefined {
  if (state.codexUse === 'usable') return undefined
  return {
    agent: 'codex',
    cause: codexUnusableCause,
    signInTo: paths.connectCodexChatGpt,
  }
}

/**
 * The Agents section in a state of the account: the open form with the
 * step of its ChatGPT sign-in, the connected logins, the share setting
 * that the app did not save, and a Codex login that the app can no longer
 * use, whose Sign in again opens the ChatGPT sign-in form.
 */
export function agentsFor(
  state: AccountState,
): ComponentProps<typeof AgentsSection> {
  const form =
    state.form === 'none'
      ? undefined
      : { ...openForms[state.form], signIn: state.codexSignIn }
  return {
    form,
    logins: loginsFor(state),
    shares: { notSaved: state.shareChange === 'not-saved' ? 'claude' : null },
    unusable: unusableFor(state),
  }
}
