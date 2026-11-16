import type { ComponentProps } from 'react'
import type {
  AgentsSection,
  OpenAgentForm,
} from '../components/settings/AccountSections'
import type { UnusableLogin } from '../components/settings/LoginNotUsable'
import { agentKeys, type AgentKey } from '../fixtures/agents'
import {
  accountLogins,
  addedV1Logins,
  codexUnusableCause,
  endpointLogins,
  keptListLogins,
  readFailedLogins,
  unlistedModelLogins,
  type AgentLogins,
  type AgentLogin,
} from '../fixtures/logins'
import { paths } from '../paths'
import type { AccountState } from './accountState'

type FormKey = Exclude<AccountState['form'], 'none'>

/**
 * The logins of each state of the own endpoint, all on Cal's proxy. The
 * agent of an open form has no login, as `loginsFor` says.
 */
const ownEndpointLogins: Readonly<
  Record<Exclude<AccountState['ownEndpoint'], 'none'>, AgentLogins>
> = {
  form: endpointLogins,
  typed: endpointLogins,
  refused: endpointLogins,
  connected: endpointLogins,
  unlisted: unlistedModelLogins,
  'v1-added': addedV1Logins,
  'read-failed': readFailedLogins,
  'read-failed-unlisted': keptListLogins,
}

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
    connectTo: paths.accountAgents,
    cancel: true,
  },
  'claude-api-key': {
    agent: 'claude',
    kind: 'api-key',
    connectTo: paths.accountAgents,
    cancel: true,
  },
  codex: {
    agent: 'codex',
    kind: 'api-key',
    connectTo: paths.accountAgents,
    cancel: true,
  },
  'codex-token': {
    agent: 'codex',
    kind: 'token',
    connectTo: paths.connectCodexChatGptCode,
    cancel: true,
  },
}

/**
 * Whether a form of Codex is open under a Codex login that the app can no
 * longer use, as Sign in again opens it. The login then stays in its row.
 */
function signingInAgain(state: AccountState): boolean {
  if (state.form === 'none' || state.codexUse === 'usable') return false
  if (state.connections === 'not-connected') return false
  return openForms[state.form].agent === 'codex'
}

/**
 * The logins of the agents in a state. The agent of the form has no login,
 * except a Codex login that the app can no longer use, which stays in its
 * row while the form is open.
 */
function loginsFor(state: AccountState): AgentLogins {
  const logins: Partial<Record<AgentKey, AgentLogin>> = {}
  if (state.connections === 'not-connected') return logins
  const kinds: AgentLogins =
    state.ownEndpoint === 'none'
      ? {
          ...accountLogins,
          codex:
            state.codexLogin === 'endpoint'
              ? endpointLogins.codex
              : { kind: state.codexLogin },
        }
      : ownEndpointLogins[state.ownEndpoint]
  const formAgent =
    state.form === 'none' || signingInAgain(state)
      ? null
      : openForms[state.form].agent
  for (const key of agentKeys) {
    if (key !== formAgent && kinds[key]) logins[key] = kinds[key]
  }
  return logins
}

/**
 * The open form, with the step of its ChatGPT sign-in. Under a Codex login
 * that the app can no longer use, the button that gets a code leads to the
 * code under that login.
 */
function formFor(state: AccountState): OpenAgentForm | undefined {
  if (state.form === 'none') return undefined
  const form = { ...openForms[state.form], signIn: state.codexSignIn }
  const endpoint =
    state.ownEndpoint === 'form'
      ? 'empty'
      : state.ownEndpoint === 'typed'
        ? 'typed'
        : state.ownEndpoint === 'refused'
          ? 'refused'
          : null
  if (endpoint)
    return {
      ...form,
      kind: 'endpoint',
      endpoint,
      connectTo: paths.ownEndpointConnected,
    }
  if (state.form !== 'codex-token' || !signingInAgain(state)) return form
  return { ...form, connectTo: paths.codexSignInAgainCode }
}

/** A Codex login that the app can no longer use, in a state. */
function unusableFor(state: AccountState): UnusableLogin | undefined {
  if (state.codexUse === 'usable') return undefined
  return {
    agent: 'codex',
    cause: codexUnusableCause,
    signInTo: paths.codexSignInAgain,
  }
}

/**
 * The Agents section in a state of the account: the open form with the
 * step of its ChatGPT sign-in, the connected logins, the share setting
 * that the app did not save, and a Codex login that the app can no longer
 * use, whose Sign in again opens the ChatGPT sign-in form under its row.
 */
export function agentsFor(
  state: AccountState,
): ComponentProps<typeof AgentsSection> {
  return {
    form: formFor(state),
    logins: loginsFor(state),
    shares: { notSaved: state.shareChange === 'not-saved' ? 'claude' : null },
    unusable: unusableFor(state),
  }
}
