import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Plus, Repeat } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { AutomationList } from '../components/automations/AutomationList'
import { SectionText } from '../components/settings/Section'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import {
  automationRows,
  suspendedAutomationRows,
} from '../fixtures/automationRows'
import { paths } from '../paths'

export const automationsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'org'],
  properties: {
    /** The automations of Acme, or an org that has none yet. */
    list: { enum: ['automations', 'empty'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org keeps
     * every read, so its members read its automations, without New automation.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type AutomationsState = SchemaProps<typeof automationsSchema>

const org = orgs.acme

/** What an automation does, in the words of the page. */
const automationWords =
  'An automation runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

/** The automation pages that the mockups draw, as Cal opens them. */
const automationLinks: Readonly<Record<string, string>> = {
  'review-prs': paths.automation,
  'dependency-updates': paths.automationAdmin,
  'copy-review': paths.automationOwnerLeft,
  'error-triage': paths.automationTurnedOff,
}

const suspendedLinks: Readonly<Record<string, string>> = {
  'review-prs': paths.suspendedAutomation,
}

const newAutomation = (
  <ScreenLink asChild to={paths.newAutomation}>
    <ActionButton icon={Plus} tone="primary">
      New automation
    </ActionButton>
  </ScreenLink>
)

/**
 * The automations of the org, which the Automations link of the sidebar opens.
 * Every member sees every automation. New automation opens an empty automation. A
 * suspended org shows its notice first, and no New automation.
 */
export function AutomationsScreen(props: {
  state: AutomationsState
  viewport: Viewport
}) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const suspended = props.state.org === 'suspended'
  const empty = props.state.list === 'empty' && !suspended
  const list = suspended ? paths.suspendedOrg : paths.shell
  const page = (
    <Page
      actions={empty || suspended ? undefined : newAutomation}
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      fill={empty}
      subtitle={org.name}
      title="Automations"
      viewport={viewport}
    >
      {empty ? (
        <EmptyState
          action={newAutomation}
          body={automationWords}
          icon={Repeat}
          title={`Create the first automation in ${org.name}`}
        />
      ) : (
        <>
          {suspended ? <SuspendedOrgNotice org={orgs[suspendedOrg]} /> : null}
          <SectionText muted>{automationWords}</SectionText>
          <AutomationList
            links={suspended ? suspendedLinks : automationLinks}
            rows={suspended ? suspendedAutomationRows : automationRows}
            viewport={viewport}
          />
        </>
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame
      rail={{ ...acmeRail, suspended: suspended ? suspendedOrg : undefined }}
      sidebar={
        <Sidebar
          current="automations"
          org={org}
          sections={suspended ? suspendedSections() : workspaceSections()}
          suspended={suspended}
          viewer={{ person: 'cal', role: 'admin' }}
        />
      }
    >
      {page}
    </AppFrame>
  )
}
