import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  type FormRepositories,
  formWait,
  WaitingRepositoryNotice,
} from '../../../docs/mockups/src/components/new-workspace/waitingRepository'
import { firstBuildCopy } from '../../../docs/mockups/src/screens/firstBuildCopy'
import type { WaitingRepositories } from '../../app/repository-changes'
import { routes } from '../../app/router'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { ActionButton } from '../ui/actions'

/**
 * The chosen repositories of the form, keyed by ID and named by full name,
 * as the shared notice takes them, or `undefined` while the form holds no
 * repository. The repository of the form is one of the chosen ones. The ID
 * tells apart two chosen repositories with the same full name.
 */
function formRepositoriesOf(
  repositories: readonly Repository[],
  repository: Repository | undefined,
  waiting: WaitingRepositories,
): FormRepositories | undefined {
  if (!repository) return undefined
  const entry = (item: Repository) => ({ key: item.id, name: item.fullName })
  const entries = (waits: boolean) =>
    repositories.filter((item) => waiting.ids.has(item.id) === waits).map(entry)
  return {
    ready: entries(false),
    waiting: entries(true),
    repository: entry(repository),
  }
}

/**
 * The notice over the composer of New workspace while the repository of
 * the form waits for its build, such as in a kept draft, or while no chosen
 * repository is ready, or `null`. It turns Send off, and the message stays.
 * `formWait` and `WaitingRepositoryNotice` of the mockups give what it
 * names, how it draws, and when an admin gets the link to the Cloud
 * computer tab. The link opens that tab through `open`.
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
  const form = formRepositoriesOf(
    props.repositories,
    props.repository,
    props.waiting,
  )
  const waits = form ? formWait(form) : undefined
  if (!waits) return null
  const computer = routes.settings(props.org.id, 'cloud-computer')
  return (
    <WaitingRepositoryNotice
      action={() => (
        <ActionButton icon={ArrowRight} onPress={() => props.open(computer)}>
          {firstBuildCopy.open}
        </ActionButton>
      )}
      admin={props.admin}
      alternative={waits.alternative}
      names={waits.names}
      wait={props.waiting.wait}
    />
  )
}
