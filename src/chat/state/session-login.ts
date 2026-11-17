import type { AgentModel } from '../../shared/generated/AgentModel'
import type { Agent } from '../../shared/generated/Agent'
import type { Session } from '../../shared/generated/Session'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { LinkedReason } from '../../../docs/mockups/src/components/chat/linkedCopy'
import type { SessionLogin } from '../../../docs/mockups/src/components/chat/SessionLogin'
import { AGENTS, loginUsable } from '../../app/api/read-core'
import {
  loginModels,
  newSessionLogin,
  type LoginSource,
} from '../../app/default-logins'
import { offeredModels } from '../../app/endpoint-models'
import type { ChatSnapshot } from './chat-snapshot'

/**
 * The login that a message of the reader runs on: the reader's own login,
 * the personal login of another member, or the org login. `name` names the
 * owner of a login that is not the reader's own, such as "Cal" or "Acme",
 * or is null when the chat does not know it.
 */
export type MessageLogin =
  { owner: 'own' } | { owner: 'member' | 'org'; name: string | null }

const own: MessageLogin = { owner: 'own' }

/**
 * Where a message of the reader goes, and the login that it runs on. A
 * session runs on its login: the personal login of a member, or the org
 * login (org login decision 1 B). It takes that login at its first message,
 * from the default login of its starter, and keeps it. A message of the
 * reader joins the session while the reader can use its login. Otherwise
 * it starts a new linked session on the default login of the reader
 * (decision 115). When no login serves the reader, the composer asks to
 * connect one (org login decision 4).
 */
export type SessionLoginView =
  | { kind: 'session'; login: MessageLogin }
  /**
   * `owner` names the owner of the login of the session for the notice:
   * another member, or the org. It is null for the reader's own login and
   * for an older record that names no starter.
   */
  | {
      kind: 'linked'
      owner: string | null
      reason: LinkedReason
      login: MessageLogin
    }
  /** `linked` says whether the message would start a linked session. */
  | { kind: 'missing'; linked: boolean }

/** What the chat knows of its reader for the logins. */
export interface LoginReader {
  /** The ID of the reader, the user signed in. */
  id: string
  /** The own logins of the reader and the default logins of the server. */
  account: LoginSource
  /** The org of the workspace, whose org login a session can run on. */
  orgId: string
  /** The name of that org, or null when the chat does not know it. */
  orgName: string | null
}

/** The reader of the chat, or null until the account and workspace load. */
export function loginReader(snapshot: ChatSnapshot): LoginReader | null {
  const { account, workspace } = snapshot
  if (!account || !workspace) return null
  const entry = account.defaultLogins?.find(
    (item) => item.orgId === workspace.orgId,
  )
  return {
    id: account.user.id,
    account,
    orgId: workspace.orgId,
    orgName: snapshot.org?.name ?? entry?.orgName ?? null,
  }
}

/** The name of a member: the display name, or else the GitHub login. */
function memberName(
  person: Pick<MessageSender, 'displayName' | 'githubLogin'>,
): string {
  return person.displayName?.trim() || person.githubLogin
}

/**
 * The login of a new session of the reader for `agent`, which a linked
 * session takes: the default login that the server names. `excluded` is
 * the login of the session when its record says that it cannot serve. A
 * default that names it is then older than the record. After the org
 * login, the own login serves, while the app can use it. After the own
 * login, only the server knows whether the org login serves, so none does.
 */
function newLogin(
  reader: LoginReader,
  agent: Agent,
  excluded?: 'own' | 'org',
): MessageLogin | null {
  const login = newSessionLogin(reader.account, reader.orgId, agent)
  if (login === 'org' && excluded !== 'org') {
    return { owner: 'org', name: reader.orgName }
  }
  if (login === 'own' && excluded !== 'own') return own
  const ownLogin = reader.account.agentLogins.find(
    (item) => item.agent === agent,
  )
  return login === 'org' && loginUsable(ownLogin) ? own : null
}

/** A message that starts a linked session, or that no login serves. */
function linkedTo(
  login: MessageLogin | null,
  owner: string | null,
  reason: LinkedReason,
): SessionLoginView {
  return login
    ? { kind: 'linked', owner, reason, login }
    : { kind: 'missing', linked: true }
}

/**
 * The view of a session on the personal login of another member, or of a
 * session with no login of another starter: an empty session, whose first
 * message takes the default login of its starter, which only that starter
 * knows. The record says whether that login serves other members.
 */
function otherMember(
  session: Session,
  reader: LoginReader,
  name: string | null,
): SessionLoginView {
  const target = () => newLogin(reader, session.choice.agent)
  if (!session.loginAvailable) return linkedTo(target(), name, 'unavailable')
  if (!session.loginShared) return linkedTo(target(), name, 'private')
  return { kind: 'session', login: { owner: 'member', name } }
}

/**
 * The login view of a session for its reader. The session record decides
 * whether its login serves, because the account that the chat read can be
 * older than the record. The default logins of the account decide the
 * login of a new session. Null while the chat does not know its reader and
 * the record names a starter. An older record that names no starter starts
 * a linked session.
 */
export function sessionLoginOf(
  session: Session,
  reader: LoginReader | null,
): SessionLoginView | null {
  const { startedBy } = session
  const login = session.login ?? null
  const agent = session.choice.agent
  if (reader === null) {
    return startedBy === null && login === null
      ? { kind: 'linked', owner: null, reason: 'unavailable', login: own }
      : null
  }
  if (login?.type === 'org') {
    if (session.loginAvailable) {
      return { kind: 'session', login: { owner: 'org', name: reader.orgName } }
    }
    return linkedTo(
      newLogin(reader, agent, 'org'),
      reader.orgName,
      'unavailable',
    )
  }
  if (login?.type === 'personal' && login.userId === reader.id) {
    if (session.loginAvailable) return { kind: 'session', login: own }
    const target = newLogin(reader, agent, 'own')
    return target
      ? { kind: 'linked', owner: null, reason: 'unavailable', login: target }
      : { kind: 'missing', linked: false }
  }
  if (login?.type === 'personal') {
    const name = startedBy?.id === login.userId ? memberName(startedBy) : null
    return otherMember(session, reader, name)
  }
  if (startedBy === null) {
    return linkedTo(newLogin(reader, agent), null, 'unavailable')
  }
  if (startedBy.id !== reader.id) {
    return otherMember(session, reader, memberName(startedBy))
  }
  // The reader's own session with no login yet: its first message takes the
  // default login of the reader, while the record says that one serves.
  if (!session.loginAvailable) return { kind: 'missing', linked: false }
  return { kind: 'session', login: newLogin(reader, agent) ?? own }
}

/**
 * What the label in the composer names: the login of another member, or
 * the org login, which a message of the reader spends. A message on the
 * reader's own login gets no label.
 */
export function loginLabelOf(
  view: SessionLoginView | null,
): SessionLogin | undefined {
  if (view === null || view.kind === 'missing') return undefined
  const { login } = view
  if (login.owner === 'own' || login.name === null) return undefined
  return { owner: login.name }
}

/**
 * The models that the picker of the composer offers. A model of the agent
 * of the session follows the list of the login that the message runs on:
 * the reader's own list, or the last list of the org endpoint (org login
 * decision 3 A). The reader does not see the list of another member, so
 * that login hides no model. A model of the other agent opens a new
 * session on the default login of the reader for that agent, so it follows
 * the list of that login. The picker keeps `choice`, the current model.
 */
export function composerModels(
  view: SessionLoginView | null,
  reader: LoginReader | null,
  models: readonly AgentModel[],
  choice: AgentChoice,
): readonly AgentModel[] {
  if (view === null || reader === null) return models
  const owner = view.kind === 'missing' ? 'own' : view.login.owner
  const lists = AGENTS.map((agent) =>
    loginModels(
      reader.account,
      reader.orgId,
      agent,
      agent === choice.agent
        ? owner
        : (newSessionLogin(reader.account, reader.orgId, agent) ?? 'own'),
    ),
  )
  return offeredModels(models, lists, choice)
}
