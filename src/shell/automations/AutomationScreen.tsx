import { useEffect } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../../ui/components/common/EmptyState'
import { newAutomationDraft } from '../../app/automation-draft'
import { automationModel } from '../../app/automation-model'
import { routes, type AutomationTab } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { AutomationEditor } from './AutomationEditor'
import { AutomationFrame } from './AutomationFrame'
import { AutomationReader } from './AutomationReader'

/** The wait of the first read, with the title of a new automation, or Automation alone. */
function Waiting(props: { org: OrgSummary; title?: string }) {
  const theme = useSharedUiTheme()
  return (
    <AutomationFrame org={props.org} title={props.title}>
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the automation"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    </AutomationFrame>
  )
}

/** An automation that the org no longer has, such as one that was deleted. */
function Missing(props: { org: OrgSummary }) {
  const go = useGo()
  return (
    <AutomationFrame org={props.org}>
      <EmptyState
        action={
          <ActionButton
            onPress={() => go(routes.automations(props.org.id))}
            tone="primary"
          >
            Open Automations
          </ActionButton>
        }
        icon={SearchX}
        title="This automation is not available"
      />
    </AutomationFrame>
  )
}

function SavedAutomation(props: {
  org: OrgSummary
  automationId: string
  tab: AutomationTab
  user: User
}) {
  const { org } = props
  const orgModel = useOrgModel(org.id)
  const model = automationModel(orgModel, props.automationId)
  const automation = useStore(model.automation)
  const runLogin = useStore(model.runLogin)
  const chosenSecrets = useStore(model.chosenSecrets)
  const runs = useStore(model.runs.shown)
  const repositories = useStore(orgModel.repositories)
  const sections = useStore(orgModel.sections)
  const { suspended } = useOrgAccess(org)
  // The runs read with the automation, and stop when the automation fails to read.
  const failed = automation.state === 'failed'
  useEffect(() => model.watch(), [model])
  useEffect(() => (failed ? undefined : model.runs.watch()), [model, failed])
  useEffect(() => orgModel.watch('repositories', 'list', 'members'), [orgModel])
  if (automation.state === 'failed') {
    if (automation.error.code === 'automation_not_found')
      return <Missing org={org} />
    return (
      <AutomationFrame org={org}>
        <LoadFailure
          error={automation.error}
          retry={() => model.reload()}
          title="The automation didn't load"
        />
      </AutomationFrame>
    )
  }
  if (
    automation.state === 'loading' ||
    repositories.state === 'loading' ||
    sections.state === 'loading'
  ) {
    return <Waiting org={org} />
  }
  const shared = {
    repositories: repositories.state === 'ready' ? repositories.value : [],
    sections: sections.state === 'ready' ? sections.value : [],
    chosenSecrets: valueOf(chosenSecrets) ?? null,
    tab: props.tab,
    runs: {
      runs,
      loadOlder: () => model.runs.loadOlder(),
      retry: () => model.runs.reload(),
    },
  }
  if (!suspended && automation.value.owner.id === props.user.id) {
    return (
      <AutomationEditor
        org={org}
        automation={automation.value}
        user={props.user}
        {...shared}
      />
    )
  }
  return (
    <AutomationReader
      access={
        suspended ? 'suspended' : org.role === 'admin' ? 'admin' : 'member'
      }
      org={org}
      automation={automation.value}
      runLogin={valueOf(runLogin) ?? null}
      user={props.user}
      {...shared}
    />
  )
}

/**
 * A new automation: active, in the first chosen repository and General, with
 * the owner's default model and the time zone of the browser. A suspended
 * org creates nothing, so its page shows only the notice of the frame.
 */
function NewAutomation(props: { org: OrgSummary; user: User }) {
  const { org } = props
  const app = useApp()
  const orgModel = useOrgModel(org.id)
  const account = useStore(app.account.account)
  const repositories = useStore(orgModel.repositories)
  const sections = useStore(orgModel.sections)
  const { suspended } = useOrgAccess(org)
  const { timeZone } = useServices()
  useEffect(() => orgModel.watch('repositories', 'list', 'members'), [orgModel])
  if (suspended) return <AutomationFrame org={org} title="New automation" />
  if (
    !account ||
    repositories.state === 'loading' ||
    sections.state === 'loading'
  ) {
    return <Waiting org={org} title="New automation" />
  }
  const lists = {
    repositories: repositories.state === 'ready' ? repositories.value : [],
    sections: sections.state === 'ready' ? sections.value : [],
  }
  const initial = newAutomationDraft({
    ...lists,
    choice: account.defaultChoice,
    timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return (
    <AutomationEditor
      initial={initial}
      org={org}
      automation={null}
      runs={null}
      tab="automation"
      user={props.user}
      {...lists}
    />
  )
}

/**
 * The page of an automation, or of a new automation when `automationId` is null,
 * with its runs. Its owner changes it and uses Run now. Every other member
 * reads it, and an admin can also turn it off and delete it. A suspended
 * org shows it read-only to all. `tab` is the tab that a phone shows.
 */
export function AutomationScreen(props: {
  org: OrgSummary
  automationId: string | null
  tab: AutomationTab
  user: User
}) {
  if (props.automationId === null) {
    return <NewAutomation org={props.org} user={props.user} />
  }
  return (
    <SavedAutomation
      org={props.org}
      automationId={props.automationId}
      tab={props.tab}
      user={props.user}
    />
  )
}
