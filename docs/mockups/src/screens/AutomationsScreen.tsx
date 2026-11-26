import type { SchemaProps, Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import { emptyState } from '../entries/components/common/EmptyState.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import { acmeRail } from '../components/layout/OrgRail'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { suspendedOrgNotice } from '../entries/components/orgs/SuspendedOrgNotice.mockup'
import { AutomationList } from '../components/automations/AutomationList'
import { sectionText } from '../entries/components/settings/Section.mockup'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { sidebar } from '../entries/components/workspaces/Sidebar.mockup'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import {
  automationRows,
  suspendedAutomationRows,
} from '../fixtures/automationRows'
import { paths } from '../paths'
import { defined, plainData } from '../defined'

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
    <actionButton.Component
      icon="plus"
      moklyInstance="new-automation"
      tone="primary"
    >
      New automation
    </actionButton.Component>
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
    <pagePart.Component
      fill={empty}
      {...defined({
        actions: empty || suspended ? undefined : newAutomation,
        back: mobile ? { label: 'Workspaces', to: list } : undefined,
      })}
      subtitle={org.name}
      title="Automations"
      viewport={viewport}
    >
      {empty ? (
        <emptyState.Component
          action={newAutomation}
          body={automationWords}
          icon="repeat"
          moklyInstance="no-automations"
          title={`Create the first automation in ${org.name}`}
        />
      ) : (
        <>
          {suspended ? (
            <suspendedOrgNotice.Component
              moklyInstance="suspended-org-notice"
              org={{ name: orgs[suspendedOrg].name }}
            />
          ) : null}
          <sectionText.Component moklyInstance="automations-text" muted>
            {automationWords}
          </sectionText.Component>
          <AutomationList
            links={suspended ? suspendedLinks : automationLinks}
            rows={suspended ? suspendedAutomationRows : automationRows}
            viewport={viewport}
          />
        </>
      )}
    </pagePart.Component>
  )
  if (mobile) return <mobileFrame.Component>{page}</mobileFrame.Component>
  return (
    <appFrame.Component
      rail={{ ...acmeRail, ...(suspended ? { suspended: suspendedOrg } : {}) }}
      sidebar={
        <sidebar.Component
          current="automations"
          moklyInstance="sidebar"
          org={org}
          sections={plainData(
            suspended ? suspendedSections() : workspaceSections(),
          )}
          suspended={suspended}
          viewer={{ person: 'cal', role: 'admin' }}
        />
      }
    >
      {page}
    </appFrame.Component>
  )
}
