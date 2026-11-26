import type { ChatContext } from '../state/context'
import { readSecretRequests } from './secret-actions'
import { releasable } from './secret-open'

/**
 * Reads the secret requests of the workspace once for each request that
 * settles, when the Allow that settles it ended in the Worker, as
 * `releasable` says: at once after the Allow of another view, and after the
 * reply of an Allow of this window. A read earlier than the reply could come
 * before the Worker allowed the requests that the grant covers. The read
 * releases each request that its own event did not end, as
 * `readSecretRequests` says, such as one that the grant did not cover. The
 * returned function stops the watch.
 */
export function watchSettling(context: ChatContext): () => void {
  let before = context.store.get().secrets
  return context.store.subscribe(() => {
    const was = before
    const { secrets } = context.store.get()
    before = secrets
    if (secrets.settling === was.settling && secrets.answers === was.answers)
      return
    const due = releasable(was)
    if (releasable(secrets).some((id) => !due.includes(id)))
      void readSecretRequests(context)
  })
}
