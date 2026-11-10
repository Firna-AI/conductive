import type { ReactElement } from 'react'
import { ArrowRight } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import type { MenuEntry } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import {
  type FormRepositories,
  type FormRepository,
  formWait,
  WaitingRepositoryNotice,
} from '../components/new-workspace/waitingRepository'
import {
  menuNotes,
  type RepositoryWait,
} from '../components/settings/repositoryChangeCopy'
import { addedRepository, repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import { firstBuildCopy } from './firstBuildCopy'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

/**
 * A repository of a form in the mockups. Their sample repositories have
 * unique full names, so the full name is the key.
 */
export function namedRepository(name: string): FormRepository {
  return { key: name, name }
}

/** The repositories that the cloud computer of Acme holds. */
const acmeReady = Object.values(repositories).map((item) =>
  namedRepository(item.name),
)

/** The repository of a new workspace of Acme, as Saved carts uses. */
const acmeFirst = namedRepository(repositories[savedCarts.repository].name)

/** The repository that an admin of Acme added, which waits for its build. */
const acmeAdded = namedRepository(addedRepository)

/**
 * The repositories of a form of Acme. The form picks the first ready
 * repository, and a kept draft keeps its own, also when it waits.
 */
export function acmeFormRepositories(
  choice: NewWorkspaceFormState['repositories'],
): FormRepositories {
  switch (choice) {
    case 'chosen':
    case 'none':
      return { ready: acmeReady, waiting: [], repository: acmeFirst }
    case 'waiting':
      return { ready: acmeReady, waiting: [acmeAdded], repository: acmeFirst }
    case 'draft-waits':
      return { ready: acmeReady, waiting: [acmeAdded], repository: acmeAdded }
    case 'none-ready':
      return { ready: [], waiting: [acmeAdded], repository: acmeAdded }
  }
}

/**
 * The repository menu: each chosen repository, with a check on the one of
 * the form. A waiting repository keeps its place, off, with a note that
 * says when it is ready.
 */
export function repositoryMenu(
  form: FormRepositories,
  wait: RepositoryWait,
): MenuEntry[] {
  const item = (entry: FormRepository, waits: boolean): MenuEntry => ({
    kind: 'item',
    label: entry.name,
    checked: entry.key === form.repository.key,
    disabled: waits,
    detail: waits ? menuNotes[wait] : undefined,
  })
  return [
    ...form.ready.map((entry) => item(entry, false)),
    ...form.waiting.map((entry) => item(entry, true)),
  ]
}

/**
 * The page of the Cloud computer tab for the action of an admin: Try again
 * after a failed build, or Build computer when no build runs.
 */
const computerPages: Readonly<
  Record<Exclude<RepositoryWait, 'building'>, string>
> = {
  failed: paths.repositoriesChangedFailed,
  waiting: paths.repositoriesChangedNoBuild,
}

/**
 * The notice of a form whose repository waits, or `null`. The link of an
 * admin opens the Cloud computer tab in the state of the build.
 */
export function waitingNotice(props: {
  form: FormRepositories
  wait: RepositoryWait
  admin: boolean
}): ReactElement | null {
  const waits = formWait(props.form)
  if (!waits) return null
  return (
    <WaitingRepositoryNotice
      action={(wait) => (
        <ScreenLink asChild to={computerPages[wait]}>
          <ActionButton icon={ArrowRight}>{firstBuildCopy.open}</ActionButton>
        </ScreenLink>
      )}
      admin={props.admin}
      alternative={waits.alternative}
      key="waiting-repository"
      names={waits.names}
      wait={props.wait}
    />
  )
}
