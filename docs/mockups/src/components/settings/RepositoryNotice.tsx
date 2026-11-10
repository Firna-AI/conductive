import type { ReactNode } from 'react'
import { CircleAlert, Hammer } from 'lucide-react'
import { Notice } from '../common/Notice'
import {
  repositoryNoticeText,
  type RepositoryWait,
} from './repositoryChangeCopy'

/**
 * The repository notice of the Repositories and Cloud computer tabs. It
 * shows while the org image lacks a chosen repository or still holds a
 * removed one, once the org has an image. Before the first good build, the
 * notices of the first build cover that time.
 *
 * - `failed`: the newest build failed and no build runs. An admin on the
 *   Repositories tab gets Try again in `action`.
 * - `building`: a build runs while an added repository waits. The notice
 *   shows a spinner, and nobody gets an action.
 * - `waiting`: the changes wait for a build, such as after a removal or a
 *   start that failed. An admin on the Repositories tab gets Build computer
 *   in `action`.
 *
 * On the Cloud computer tab the notice has no action, also for an admin,
 * because the build card under it has the same action. A member who is not
 * an admin gets no action, and reads who can act. The notice draws nothing
 * when no change waits.
 */
export function RepositoryNotice(props: {
  wait: RepositoryWait
  /** The chosen repositories that the org image does not hold yet. */
  added: readonly string[]
  /** The repositories that the org image holds and the org no longer chose. */
  removed: readonly string[]
  /** An admin, who changes the repositories and builds the computer. */
  admin: boolean
  /** Try again or Build computer, for an admin on the Repositories tab. */
  action?: ReactNode
}) {
  if (props.added.length === 0 && props.removed.length === 0) return null
  const text = repositoryNoticeText(props)
  const failed = props.wait === 'failed'
  // Only an added repository makes a build that runs count for the notice.
  const busy = props.wait === 'building' && props.added.length > 0
  return (
    <Notice
      action={props.action}
      body={text.body}
      busy={busy}
      icon={failed ? CircleAlert : Hammer}
      title={text.title}
      tone={failed ? 'danger' : 'neutral'}
    />
  )
}
