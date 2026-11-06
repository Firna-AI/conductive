import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import type { StepState } from '../../app/get-started'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { LoadFailure } from '../ui/LoadFailure'
import { repositoryCount } from '../account/labels'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { DoneStatus } from './stepParts'

const title = '2. Create your first org'

/** The first org, with the number of the repositories that it chose. */
function CreatedText(props: { org: OrgSummary }) {
  const model = useOrgModel(props.org.id)
  const repositories = useStore(model.repositories)
  useEffect(() => {
    model.ensure('repositories')
  }, [model])
  switch (repositories.state) {
    case 'loading':
      return null
    case 'failed':
      return (
        <LoadFailure
          error={repositories.error}
          retry={() => model.reload('repositories')}
          title="The repositories didn't load"
        />
      )
    case 'ready': {
      const chosen = repositories.value.filter((item) => item.selected)
      return (
        <SectionText>
          <span className={styles.strong}>{props.org.name}</span>, with{' '}
          {repositoryCount(chosen.length)}.
        </SectionText>
      )
    }
  }
}

/**
 * The first org. Create org opens the form of the first org, which comes
 * back to Get started. Before the GitHub App is installed, the button is
 * off.
 */
export function OrgStep(props: { state: StepState; org: OrgSummary | null }) {
  const go = useGo()
  if (props.state === 'done') {
    return (
      <Section status={<DoneStatus label="Created" />} title={title}>
        {props.org ? <CreatedText org={props.org} /> : null}
      </Section>
    )
  }
  const next = props.state === 'next'
  return (
    <Section
      actions={
        <ActionButton
          disabled={!next}
          icon={Plus}
          onPress={() => go(routes.createOrg(true))}
          tone={next ? 'primary' : 'secondary'}
        >
          Create org
        </ActionButton>
      }
      description="An org holds your workspaces, the repositories that they use, and their cloud computer."
      title={title}
    />
  )
}
