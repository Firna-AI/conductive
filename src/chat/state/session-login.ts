import type { AgentModel } from '../../shared/generated/AgentModel'
import type { Agent } from '../../shared/generated/Agent'
import type { Session } from '../../shared/generated/Session'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { SessionLogin } from '../../shared/generated/SessionLogin'
import type { LinkedReason } from '../../ui/components/chat/linkedCopy'
import type { SessionLogin as LoginLabel } from '../../ui/components/chat/SessionLogin'
import { AGENTS, loginUsable } from '../../app/api/read-core'
import {
  loginModels,
  newSessionLogin,
  type LoginSource,
} from '../../app/default-logins'
import { offeredModels } from '../../app/endpoint-models'
import { loginOwnerName } from '../../app/login-owner'
import { personName } from '../../app/people'
import type { LoginObservation } from '../../app/login-observation'
import type { ChatSnapshot } from './chat-snapshot'

/**
 * The login that a message of the reader runs on: the reader's own login,
 * the personal login of another member, or the org login. `name` names the
 * owner of a login that is not the reader's own, such as "Cal" or "Acme",
 * or is null when the chat does not know it.
 */
type MessageLogin =
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
  /** Only complete account replies newer than a failed empty-session fact count. */
  current?: (observation: LoginObservation) => boolean
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
    current: snapshot.loginObservationCurrent,
  }
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
 * The login that the composer follows for a session: the login that the
 * session keeps, or, in an empty session of another member, the default
 * login of its starter. The server names that default login in the record
 * until the first message, which takes it. The reader's own empty session
 * follows the default logins of the reader's account instead, as
 * `sessionLoginOf` says.
 */
function loginOf(session: Session, reader: LoginReader): SessionLogin | null {
  if (session.login) return session.login
  const starter = session.startedBy
  if (starter === null || starter.id === reader.id) return null
  return session.defaultLogin ?? null
}

/**
 * The view of a session on the personal login of another member, or of an
 * empty session of another starter whose record names no default login.
 * The record says whether that login serves other members.
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
  const agent = session.choice.agent
  if (reader === null) {
    return startedBy === null && !session.login
      ? { kind: 'linked', owner: null, reason: 'unavailable', login: own }
      : null
  }
  const login = loginOf(session, reader)
  const ownerName = (owner: SessionLogin) =>
    loginOwnerName(owner, reader.orgName, startedBy ? [startedBy] : [])
  if (login?.type === 'org') {
    const name = ownerName(login)
    if (session.loginAvailable) {
      return { kind: 'session', login: { owner: 'org', name } }
    }
    return linkedTo(newLogin(reader, agent, 'org'), name, 'unavailable')
  }
  if (login?.type === 'personal' && login.userId === reader.id) {
    if (session.loginAvailable) return { kind: 'session', login: own }
    const target = newLogin(reader, agent, 'own')
    return target
      ? { kind: 'linked', owner: null, reason: 'unavailable', login: target }
      : { kind: 'missing', linked: false }
  }
  if (login?.type === 'personal') {
    return otherMember(session, reader, ownerName(login))
  }
  if (startedBy === null) {
    return linkedTo(newLogin(reader, agent), null, 'unavailable')
  }
  // An empty session of another member whose record names no default login:
  // no login serves its starter, or an older record does not say.
  if (startedBy.id !== reader.id) {
    return otherMember(session, reader, personName(startedBy))
  }
  // The reader's own session with no login yet: its first message takes the
  // default login of the reader, while the record says that one serves.
  if (!session.loginAvailable) {
    const current = reader.current?.({
      agent,
      orgId: reader.orgId,
      login: session.defaultLogin ?? null,
      available: false,
      source: session.id,
    })
    const login = current ? newLogin(reader, agent) : null
    return login
      ? { kind: 'session', login }
      : { kind: 'missing', linked: false }
  }
  return { kind: 'session', login: newLogin(reader, agent) ?? own }
}

/**
 * What the label in the composer names: the login of another member, or
 * the org login, which a message of the reader spends. A message on the
 * reader's own login gets no label.
 */
export function loginLabelOf(
  view: SessionLoginView | null,
): LoginLabel | undefined {
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
