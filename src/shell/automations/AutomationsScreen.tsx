import { useEffect, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Plus, Repeat } from 'lucide-react'
import { EmptyState } from '../../ui/components/common/EmptyState'
import { SuspendedOrgNotice } from '../../ui/components/orgs/SuspendedOrgNotice'
import { SectionText } from '../../ui/components/settings/Section'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { automationWords } from './automation-copy'
import { AutomationList } from './AutomationList'

/**
 * The automations of the org, which the Automations link of the sidebar and of
 * the phone list opens. Every member sees every automation, and New automation
 * opens an empty automation. An org without automations says what an automation
 * does, with one New automation. A suspended org shows its notice first, and
 * its automations without New automation, because nothing in it can change.
 */
export function AutomationsScreen(props: { org: OrgSummary }) {
  const { org } = props
  const model = useOrgModel(org.id)
  const automations = useStore(model.automations)
  const repositories = useStore(model.repositories)
  const { suspended } = useOrgAccess(org)
  const theme = useSharedUiTheme()
  const go = useGo()
  useEffect(() => model.watch('automations', 'repositories'), [model])
  const listed = automations.state === 'ready' ? automations.value : null
  const empty = listed !== null && listed.length === 0 && !suspended
  const newAutomation = (
    <ActionButton
      icon={Plus}
      onPress={() => go(routes.newAutomation(org.id))}
      tone="primary"
    >
      New automation
    </ActionButton>
  )
  let body: ReactNode
  if (automations.state === 'failed') {
    body = (
      <LoadFailure
        error={automations.error}
        retry={() => model.reload('automations')}
        title="The automations didn't load"
      />
    )
  } else if (listed === null || repositories.state === 'loading') {
    body = (
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the automations"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    )
  } else if (empty) {
    body = (
      <EmptyState
        action={newAutomation}
        body={automationWords}
        icon={Repeat}
        title={`Create the first automation in ${org.name}`}
      />
    )
  } else {
    body = (
      <>
        <SectionText muted>{automationWords}</SectionText>
        {listed.length > 0 ? (
          <AutomationList
            orgId={org.id}
            repositories={
              repositories.state === 'ready' ? repositories.value : []
            }
            automations={listed}
          />
        ) : null}
      </>
    )
  }
  return (
    <Page
      actions={
        listed !== null && listed.length > 0 && !suspended
          ? newAutomation
          : undefined
      }
      back={{ label: 'Workspaces', to: routes.org(org.id) }}
      fill={empty}
      subtitle={org.name}
      title="Automations"
    >
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      {body}
    </Page>
  )
}
