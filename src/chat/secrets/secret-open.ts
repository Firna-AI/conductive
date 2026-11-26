import type { SecretRequest } from '../../shared/secret-requests'
import { secretSetKey } from '../../ui/components/chat/requestStackOrder'
import type { KnownRequest, SecretsSnapshot } from './secret-snapshot'

// The open secret requests: which of them wait for a member, and which
// settle while the Worker covers them with an Allow.

/** A member can answer a request while it waits, also after its call ended. */
export function isOpen(request: SecretRequest): boolean {
  return request.state === 'waiting' || request.state === 'late'
}

/**
 * An open request waits for the answer of a member, in the stack above the
 * composer, unless it settles, as `withSettling` says.
 */
export function waitsForAnswer(
  secrets: SecretsSnapshot,
  request: SecretRequest,
): boolean {
  return isOpen(request) && !Object.hasOwn(secrets.settling, request.id)
}

/** The set of secrets of a request as one key, as the stack groups them. */
function setOf(request: SecretRequest): string {
  return secretSetKey(request.secrets.map((secret) => secret.name))
}

/** Whether `a` was made before `b`, in the order of the stack. */
function madeBefore(a: KnownRequest, b: KnownRequest): boolean {
  const order = (known: KnownRequest) =>
    known.firstNumber ?? Number.MAX_SAFE_INTEGER
  const earlier =
    a.request.createdAt - b.request.createdAt ||
    order(a) - order(b) ||
    a.request.id.localeCompare(b.request.id)
  return earlier < 0
}

/**
 * The marks of the settling requests after a new shown state of the request
 * `id`, whose shown state before was open when `wasOpen`. When an open
 * request becomes allowed, by its event or by a reply, its grant covers each
 * older open request of its session for the same set of secrets: the
 * requests that its card hides. The Worker publishes that Allow first, and
 * then allows each of them, each with its own event. Meanwhile each of them
 * settles: it leaves the stack with the card and shows nowhere, so no card
 * offers it again. A request that is no longer open loses its mark, and a
 * read releases the rest, as `releasable` says.
 */
export function withSettling(
  secrets: SecretsSnapshot,
  id: string,
  wasOpen: boolean,
): SecretsSnapshot {
  const known = secrets.requests[id]
  if (known === undefined) return secrets
  const { request } = known
  let settling = secrets.settling
  if (Object.hasOwn(settling, id) && !isOpen(request))
    settling = Object.fromEntries(
      Object.entries(settling).filter(([key]) => key !== id),
    )
  if (wasOpen && request.state === 'allowed') {
    const set = setOf(request)
    for (const other of Object.values(secrets.requests)) {
      if (
        other.request.sessionId === request.sessionId &&
        isOpen(other.request) &&
        setOf(other.request) === set &&
        madeBefore(other, known)
      )
        settling = { ...settling, [other.request.id]: id }
    }
  }
  return settling === secrets.settling ? secrets : { ...secrets, settling }
}

/**
 * The settling requests that a read of the list releases: each one whose
 * Allow ended in the Worker, as far as this window knows. An Allow of
 * another view ended when its event came. An Allow of this window ended
 * when its reply came, because the Worker replies after it allowed each
 * request that the grant covers.
 */
export function releasable(secrets: SecretsSnapshot): string[] {
  return Object.entries(secrets.settling).flatMap(([id, by]) =>
    Object.hasOwn(secrets.answers, by) ? [] : [id],
  )
}

/** The snapshot without the marks of `ids`, which a read released. */
export function withReleased(
  secrets: SecretsSnapshot,
  ids: readonly string[],
): SecretsSnapshot {
  const kept = Object.entries(secrets.settling).filter(
    ([id]) => !ids.includes(id),
  )
  return kept.length === Object.keys(secrets.settling).length
    ? secrets
    : { ...secrets, settling: Object.fromEntries(kept) }
}
