import type { ReactNode } from 'react'
import { CircleAlert, Hammer } from 'lucide-react'
import { Notice } from '../common/Notice'
import {
  type RepositoryWait,
  waitingFormText,
} from '../settings/repositoryChangeCopy'

/**
 * The waiting repository of a New workspace form: what the form waits for,
 * and the notice over its composer. A waiting repository is a chosen
 * repository that the org image does not hold yet. The mockups and the app
 * share this module, so it imports no part of the catalogue.
 */

/**
 * A chosen repository of a New workspace form, with its full name in
 * `name`. `key` tells it apart from the other chosen repositories, also
 * from one with the same full name. The app uses the ID of the repository
 * as the key, and the mockups use the full name.
 */
export type FormRepository = { key: string; name: string }

/**
 * The chosen repositories of a New workspace form, and the repository that
 * the form holds. The page and the dialog share them.
 */
export type FormRepositories = {
  /** The chosen repositories that the cloud computer of the org holds. */
  ready: readonly FormRepository[]
  /** The chosen repositories that wait for their build. */
  waiting: readonly FormRepository[]
  /** The repository of the form. */
  repository: FormRepository
}

/**
 * What the form waits for, when its repository waits: the name of the
 * repository of the form, or of each chosen repository when none is ready.
 * `alternative` says that another chosen repository is ready. It is
 * `undefined` while the repository of the form is ready. The keys tell the
 * repositories apart. While the form waits, Send is off.
 */
export function formWait(
  form: FormRepositories,
): { names: readonly string[]; alternative: boolean } | undefined {
  const { repository } = form
  if (!form.waiting.some((item) => item.key === repository.key)) {
    return undefined
  }
  const alternative = form.ready.length > 0
  const names = alternative
    ? [repository.name]
    : form.waiting.map((item) => item.name)
  return { names, alternative }
}

/**
 * The notice of a New workspace page or dialog while the repository of the
 * form waits for its build, such as in a kept draft, or while no chosen
 * repository is ready. Send stays off, and the message stays. `names` and
 * `alternative` come from `formWait`. While the build runs, the notice
 * shows a spinner. After a failed build it has the danger tone, and else
 * the hammer. Only an admin builds the computer, so only an admin gets the
 * link of `action` to the Cloud computer tab, in each state, as in the
 * notice of the first build. While the build runs, the admin can follow it
 * there. A refresh never counts as a build that runs, so the notice never
 * shows a refresh as its build. A member reads who can act.
 */
export function WaitingRepositoryNotice(props: {
  wait: RepositoryWait
  names: readonly string[]
  alternative: boolean
  admin: boolean
  /**
   * The link to the Cloud computer tab, which gets the state of the build:
   * a build runs, the newest build failed, or the changes wait for a build.
   */
  action: (wait: RepositoryWait) => ReactNode
}) {
  const { wait } = props
  const text = waitingFormText(props)
  const failed = wait === 'failed'
  return (
    <Notice
      action={props.admin ? props.action(wait) : undefined}
      body={text.body}
      busy={wait === 'building'}
      icon={failed ? CircleAlert : Hammer}
      title={text.title}
      tone={failed ? 'danger' : 'neutral'}
    />
  )
}
