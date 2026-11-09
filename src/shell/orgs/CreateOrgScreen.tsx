import { useEffect, useState } from 'react'
import { useToast } from '@firna/ui/toast'
import { TriangleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/screens/forms.module.css'
import { routes } from '../../app/router'
import { asApiError, useStore } from '../../app/store'
import { useApp } from '../context'
import { Page } from '../layout/Page'
import { Loaded } from '../settings/LoadState'
import { ChoiceActions, RepositorySearch } from '../settings/RepositorySearch'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import {
  orgNameFields,
  OrgNameFields,
  type OrgNameDraft,
} from './OrgNameFields'

/**
 * Creates an org: its name, its initials, and the repositories that its
 * workspaces use. Before the org exists, the list holds the repositories
 * that the person and the shared GitHub App both reach. Create org stays
 * off until the person chooses at least one, also when the list is empty.
 * The first org of Get started goes back to Get started, and another org
 * opens. On a phone the actions sit in the footer.
 */
export function CreateOrgScreen(props: { first: boolean }) {
  const app = useApp()
  const go = useGo()
  const { toast } = useToast()
  const phone = useViewport() === 'phone'
  const catalogue = useStore(app.account.repositories)
  const [draft, setDraft] = useState<OrgNameDraft>({ name: '', initials: '' })
  const [chosen, setChosen] = useState<readonly number[]>([])
  useEffect(() => {
    void app.account.loadRepositories()
  }, [app])
  const cancelTo = props.first ? routes.getStarted() : routes.home()
  const create = useAction(async () => {
    const org = await app.createOrg({
      ...orgNameFields(draft),
      repositoryIds: chosen,
    })
    if (!props.first) {
      go(routes.org(org.id))
      return
    }
    // The org exists now. A failed refresh warns, and Get started opens.
    await app.refreshGetStarted().catch((error: unknown) => {
      toast({
        title: "The steps didn't update.",
        description: asApiError(error).message,
        tone: 'error',
      })
    })
    go(routes.getStarted())
  })
  // An org needs a name and at least one repository, because Create org
  // starts the first build of its cloud computer.
  const complete = draft.name.trim() !== '' && chosen.length > 0
  const submit = () => {
    if (complete && !create.pending) create.run()
  }
  const choose = (githubId: number, selected: boolean) =>
    setChosen((current) =>
      selected
        ? [...current.filter((id) => id !== githubId), githubId]
        : current.filter((id) => id !== githubId),
    )
  const actions = (
    <>
      <ActionButton disabled={create.pending} onPress={() => go(cancelTo)}>
        Cancel
      </ActionButton>
      <ActionButton
        busy={create.pending}
        disabled={!complete}
        onPress={submit}
        tone="primary"
      >
        Create org
      </ActionButton>
    </>
  )
  return (
    <Page
      actions={phone ? actions : undefined}
      back={{ label: 'Cancel', to: cancelTo }}
      title="Create an org"
    >
      <div className={styles.form}>
        <OrgNameFields
          change={(next) => {
            setDraft(next)
            create.reset()
          }}
          disabled={create.pending}
          draft={draft}
          submit={submit}
        />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Repositories</span>
          <span className={styles.fieldHint}>
            The cloud computer of the org holds these repositories, and its
            workspaces start in them. Add at least one.
          </span>
          <Loaded
            failure="The repositories didn't load"
            retry={() => app.account.loadRepositories()}
            value={catalogue}
          >
            {(value) => (
              <RepositorySearch
                actions={(repository) => (
                  <ChoiceActions
                    disabled={create.pending}
                    name={repository.fullName}
                    press={(selected) => choose(repository.githubId, selected)}
                    selected={chosen.includes(repository.githubId)}
                  />
                )}
                keyOf={(repository) => repository.githubId}
                repositories={value.repositories}
              />
            )}
          </Loaded>
        </div>
        {create.error ? (
          <Notice
            body={create.error.message}
            icon={TriangleAlert}
            title="The org wasn't created"
            tone="danger"
          />
        ) : null}
        {phone ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
}
