import type { ReactNode } from 'react'
import { ArrowRight, CircleAlert, Hammer } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { waitingFormText } from '../../../docs/mockups/src/components/settings/repositoryChangeCopy'
import { firstBuildCopy } from '../../../docs/mockups/src/screens/firstBuildCopy'
import type { WaitingRepositories } from '../../app/repository-changes'
import { routes } from '../../app/router'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { ActionButton } from '../ui/actions'

/**
 * What a form waits for while its repository waits for a build: the
 * repository of the form, or each chosen repository when none is ready.
 * `alternative` says that another chosen repository is ready. It is
 * `undefined` while the repository of the form is ready.
 */
function formWait(
  repositories: readonly Repository[],
  repository: Repository | undefined,
  waiting: WaitingRepositories,
): { names: readonly string[]; alternative: boolean } | undefined {
  if (!repository || !waiting.ids.has(repository.id)) return undefined
  const alternative = repositories.some((item) => !waiting.ids.has(item.id))
  // With none ready, each chosen repository waits.
  const names = alternative
    ? [repository.fullName]
    : repositories.map((item) => item.fullName)
  return { names, alternative }
}

/**
 * The notice over the composer of New workspace while the repository of
 * the form waits for its build, such as in a kept draft, or while no chosen
 * repository is ready, or `null`. It turns Send off, and the message stays.
 * Its words come from `waitingFormText` of the mockups, and it draws as
 * their `WaitingRepositoryNotice`: a spinner while the build runs, else the
 * danger tone after a failed build or the hammer. Only an admin builds the
 * computer, so only an admin gets the link to the Cloud computer tab, and
 * only while no build runs: during the build that tab offers nothing to do.
 * A member reads who can act.
 */
export function waitingNotice(props: {
  org: OrgSummary
  admin: boolean
  /** The chosen repositories. */
  repositories: readonly Repository[]
  /** The repository of the form. */
  repository: Repository | undefined
  waiting: WaitingRepositories
  open: (to: string) => void
}): ReactNode {
  const waits = formWait(props.repositories, props.repository, props.waiting)
  if (!waits) return null
  const { wait } = props.waiting
  const text = waitingFormText({ ...waits, wait, admin: props.admin })
  const failed = wait === 'failed'
  const link =
    props.admin && wait !== 'building' ? (
      <ActionButton
        icon={ArrowRight}
        onPress={() =>
          props.open(routes.settings(props.org.id, 'cloud-computer'))
        }
      >
        {firstBuildCopy.open}
      </ActionButton>
    ) : undefined
  return (
    <Notice
      action={link}
      body={text.body}
      busy={wait === 'building'}
      icon={failed ? CircleAlert : Hammer}
      title={text.title}
      tone={failed ? 'danger' : 'neutral'}
    />
  )
}
