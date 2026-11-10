import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import type { MenuEntry } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { WaitingRepositoryNotice } from '../components/new-workspace/notices'
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
 * The chosen repositories of a New workspace form, and the repository that
 * the form holds. The page and the dialog share them.
 */
export type FormRepositories = {
  /** The chosen repositories that the cloud computer of the org holds. */
  ready: readonly string[]
  /** The chosen repositories that wait for their build. */
  waiting: readonly string[]
  /** The repository of the form. */
  repository: string
}

/** The repositories that the cloud computer of Acme holds. */
const acmeReady = Object.values(repositories).map((item) => item.name)

/** The repository of a new workspace of Acme, as Saved carts uses. */
const acmeFirst = repositories[savedCarts.repository].name

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
      return {
        ready: acmeReady,
        waiting: [addedRepository],
        repository: acmeFirst,
      }
    case 'draft-waits':
      return {
        ready: acmeReady,
        waiting: [addedRepository],
        repository: addedRepository,
      }
    case 'none-ready':
      return {
        ready: [],
        waiting: [addedRepository],
        repository: addedRepository,
      }
  }
}

/**
 * What the form waits for, when its repository waits: the repository of the
 * form, or each chosen repository when none is ready. `alternative` says
 * that another chosen repository is ready.
 */
export function formWait(
  form: FormRepositories,
): { names: readonly string[]; alternative: boolean } | undefined {
  if (!form.waiting.includes(form.repository)) return undefined
  const alternative = form.ready.length > 0
  return { names: alternative ? [form.repository] : form.waiting, alternative }
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
  const item = (name: string, waits: boolean): MenuEntry => ({
    kind: 'item',
    label: name,
    checked: name === form.repository,
    disabled: waits,
    detail: waits ? menuNotes[wait] : undefined,
  })
  return [
    ...form.ready.map((name) => item(name, false)),
    ...form.waiting.map((name) => item(name, true)),
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
 * The notice of a form whose repository waits, or `null`. An admin gets a
 * link to the Cloud computer tab, except while the build runs.
 */
export function waitingNotice(props: {
  form: FormRepositories
  wait: RepositoryWait
  admin: boolean
}): ReactNode {
  const waits = formWait(props.form)
  if (!waits) return null
  const { wait } = props
  const link =
    props.admin && wait !== 'building' ? (
      <ScreenLink asChild to={computerPages[wait]}>
        <ActionButton icon={ArrowRight}>{firstBuildCopy.open}</ActionButton>
      </ScreenLink>
    ) : undefined
  return (
    <WaitingRepositoryNotice
      action={link}
      admin={props.admin}
      alternative={waits.alternative}
      key="waiting-repository"
      names={waits.names}
      wait={wait}
    />
  )
}
