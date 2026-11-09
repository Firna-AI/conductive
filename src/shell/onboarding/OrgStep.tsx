import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import { getStartedCopy } from '../../../docs/mockups/src/screens/getStartedCopy'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import { useFirstBuild, type FirstBuild } from '../../app/first-build'
import type { StepState } from '../../app/get-started'
import type { OrgModel } from '../../app/org-model'
import { mayChangeSettings } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore, type Loadable } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { LoadFailure } from '../ui/LoadFailure'
import { repositoryCount } from '../account/labels'
import { useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { OrgComputer, orgBuildActions } from './OrgBuild'
import { DoneStatus } from './stepParts'

const copy = getStartedCopy.org

/**
 * The org of Get started, with the number of the repositories that it
 * chose.
 */
function CreatedText(props: { org: OrgSummary }) {
  const model = useOrgModel(props.org.id)
  const repositories = useStore(model.repositories)
  useEffect(() => model.watch('repositories'), [model])
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

/** The cloud computer of the org once its builds load. */
function ComputerState(props: {
  model: OrgModel
  first: Loadable<FirstBuild>
}) {
  const { first } = props
  switch (first.state) {
    case 'loading':
      return null
    case 'failed':
      return (
        <LoadFailure
          error={first.error}
          retry={() => props.model.reload('builds')}
          title="The cloud computer didn't load"
        />
      )
    case 'ready':
      return <OrgComputer first={first.value} />
  }
}

/**
 * The org step once the org exists: its name and its repositories, and its
 * cloud computer, whose first build Create org started. Only an admin who
 * may change the settings gets Try again, Open the log, or Build computer.
 * A member sees the state of the build with no action.
 */
function CreatedStep(props: { org: OrgSummary }) {
  const { org } = props
  const go = useGo()
  const model = useOrgModel(org.id)
  const first = useFirstBuild(model)
  const admin = mayChangeSettings(useOrgAccess(org))
  const build = useAction(() => model.startBuild(), "The build didn't start.")
  const actions =
    admin && first.state === 'ready'
      ? orgBuildActions(first.value, build, () =>
          go(routes.settings(org.id, 'cloud-computer')),
        )
      : undefined
  return (
    <Section
      actions={actions}
      status={<DoneStatus label={copy.done} />}
      title={copy.title}
    >
      <CreatedText org={org} />
      <ComputerState first={first} model={model} />
    </Section>
  )
}

/**
 * The org step. Create org opens the form of Get started, which comes back
 * here. Before the GitHub App is installed, the button is off. Once the
 * org exists, the step shows its cloud computer.
 */
export function OrgStep(props: { state: StepState; org: OrgSummary | null }) {
  const go = useGo()
  if (props.state === 'done') {
    if (props.org) return <CreatedStep org={props.org} />
    return (
      <Section status={<DoneStatus label={copy.done} />} title={copy.title} />
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
          {copy.action}
        </ActionButton>
      }
      description={copy.description}
      title={copy.title}
    />
  )
}
