import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@firna/ui/toast'
import { EditRepositoryNotice } from '../../ui/components/settings/RepositoryNotice'
import { Section } from '../../ui/components/settings/Section'
import { mayChangeSettings } from '../../app/permissions'
import {
  addedRepositoryNames,
  changeRepository,
  noRepositoryChanges,
  saveRepositoryChanges,
  withRepositoryChanges,
  type RepositoryChanges,
} from '../../app/settings-actions'
import { asApiError, useStore, valueOf } from '../../app/store'
import { MemberRepositoriesTab } from '../../members/MemberRepositoriesTab'
import type { BuildsResponse, Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { useAction } from '../ui/useAction'
import { Loaded } from './LoadState'
import { useMembersApi, useMembersViewport } from './members-api'
import { RepositoryOrder } from './RepositoryOrder'
import { RepositoryEditToggle, RepositoryPicker } from './RepositoryPicker'
import { AdminRepositoryNotice } from './RepositoryChangeNotice'

/**
 * The repositories that the cloud computer of the org holds (decision 10),
 * which an admin adds, removes, and orders. The tab lists the chosen
 * repositories in the repository order, with their moves, and Edit opens
 * every repository that the GitHub App reaches, by name, with Add and
 * Remove, until Done. Add and Remove change only the open edit. Done
 * saves them and starts one build when it saved an add. A change that
 * does not save keeps the edit open, so Done can try it again. Leaving
 * the tab drops the edit. The repository notice above the list shows the
 * changes that the cloud computer does not hold yet, with Try again or
 * Build computer. While the edit adds repositories, it points to Done
 * instead, with no button. Outside Edit, Remove in the row menu of a
 * repository asks first and saves at once. Edit takes the focus after a
 * removal that leaves no row.
 */
function AdminRepositories(props: {
  org: OrgSummary
  builds: BuildsResponse | undefined
}) {
  const { org } = props
  const model = useOrgModel(org.id)
  const repositories = useStore(model.repositories)
  const build = useAction(() => model.startBuild(), 'The build did not start')
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [changes, setChanges] = useState<RepositoryChanges>(noRepositoryChanges)
  const toggle = useRef<HTMLElement | null>(null)
  const toggleRef = useCallback((element: unknown) => {
    toggle.current = element instanceof HTMLElement ? element : null
  }, [])
  const done = useAction(async (list: readonly Repository[]) => {
    const saved = await saveRepositoryChanges(model, list, changes)
    // The edit keeps its changes, and so its notice, until the build start
    // answers, so the notice offers no build that Done already starts.
    if (saved.added) {
      await model.startBuild().catch((cause: unknown) => {
        toast({
          title: 'The build did not start',
          description: asApiError(cause).message,
          tone: 'error',
        })
      })
    }
    setChanges(saved.failed)
    if (saved.failed.size > 0) throw saved.failure
    setEditing(false)
  }, 'The repositories did not change')
  useEffect(() => model.watch('repositories'), [model])
  const loaded = valueOf(repositories)
  const added = editing && loaded ? addedRepositoryNames(loaded, changes) : []
  return (
    <Section
      action={
        <RepositoryEditToggle
          busy={done.pending}
          buttonRef={toggleRef}
          editing={editing}
          toggle={() => {
            if (!editing) {
              setChanges(noRepositoryChanges)
              setEditing(true)
            } else if (loaded) done.run(loaded)
            else setEditing(false)
          }}
        />
      }
      title="Repositories"
    >
      {added.length > 0 ? (
        <EditRepositoryNotice added={added} />
      ) : (
        <AdminRepositoryNotice build={build} builds={props.builds} />
      )}
      <Loaded
        failure="The repositories did not load"
        retry={() => model.reload('repositories')}
        value={repositories}
      >
        {(list) =>
          editing ? (
            <RepositoryPicker
              change={(repository, selected) => {
                const saved =
                  list.find((item) => item.id === repository.id) ?? repository
                setChanges(changeRepository(changes, saved, selected))
              }}
              disabled={done.pending}
              repositories={withRepositoryChanges(list, changes)}
            />
          ) : (
            <RepositoryOrder
              focusEdit={() => toggle.current?.focus()}
              model={model}
              repositories={list}
            />
          )
        }
      </Loaded>
    </Section>
  )
}

/**
 * The Repositories tab. An admin adds and removes the repositories. A
 * member who is not an admin sees the chosen ones only, in the read-only
 * tab of the members UI (decision 57), and so does everyone in a suspended
 * org. Each of them reads the builds, for the repository notice.
 */
export function RepositoriesTab(props: { org: OrgSummary }) {
  const access = useOrgAccess(props.org)
  const api = useMembersApi(props.org.id)
  const viewport = useMembersViewport()
  const model = useOrgModel(props.org.id)
  const builds = valueOf(useStore(model.builds))
  useEffect(() => model.watch('builds'), [model])
  if (mayChangeSettings(access)) {
    // The key closes Edit when the screen moves to another org.
    return (
      <AdminRepositories builds={builds} key={props.org.id} org={props.org} />
    )
  }
  return (
    <MemberRepositoriesTab
      api={api}
      builds={builds}
      org={props.org}
      suspended={access.suspended}
      viewport={viewport}
    />
  )
}
