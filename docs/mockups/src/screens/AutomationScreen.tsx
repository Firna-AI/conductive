import type { Viewport } from '@mokly/mokly'
import { page } from '../entries/components/layout/Page.mockup'
import { suspendedOrgNotice } from '../entries/components/orgs/SuspendedOrgNotice.mockup'
import { DeleteAutomationDialog } from '../components/automations/DeleteAutomationDialog'
import { RunsPanel } from '../components/automations/RunsPanel'
import { offersRunNow } from '../../../../src/ui/components/automations/triggerCopy'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { editsOf } from '../fixtures/automationTriggers'
import type { Automation } from '../fixtures/automations'
import { hasOlderRuns, runLists } from '../fixtures/runLists'
import { paths } from '../paths'
import { PhoneDelete, automationActions } from './automationActions'
import {
  automationCapabilityControl,
  automationCapabilitySheet,
} from './automationCapabilities'
import { AutomationFrame } from './automationFrame'
import { AutomationNotShown } from './automationNotShown'
import {
  PhoneSheet,
  AutomationForm,
  runLinks,
  titleOf,
} from './automationParts'
import {
  accessOf,
  automationOf,
  saveStateOf,
  viewerOf,
  type AutomationState,
} from './automationState'
import { AutomationTabs } from './automationTabs'
import { defined } from '../defined'
import styles from '../../../../src/ui/screens/AutomationScreen.module.css'

/**
 * The screens that the actions open: Save of a new automation and Run now of
 * the saved automation before its first run, as in the flow "Create a
 * automation", and the question of Delete of the automation that reviews pull
 * requests.
 */
function flowLinks(state: AutomationState, automation: Automation) {
  return {
    saveTo: automation.saved ? undefined : paths.automationSaved,
    runNowTo:
      automation.key === 'morning-summary' && state.runs === 'none'
        ? paths.automationRunNow
        : undefined,
    deleteTo:
      automation.key === 'review-prs' ? paths.automationDelete : undefined,
  }
}

/**
 * The page of an automation: its name, the Active switch, the repository, the
 * section of the run workspaces, the triggers, and the prompt with its
 * model and the secrets of its runs, beside the Runs list. Desktop shows
 * the runs in a column at the right. A phone shows a saved automation in
 * two tabs, Automation and Runs. Every member sees the automation and its
 * runs, and only its owner changes it (decision 502), also the secrets of
 * its runs (automation capabilities decision 1 A). A suspended org shows
 * them read-only to everyone, under its notice: at the top of the form on
 * desktop, and above either tab on a phone. An automation that the page
 * cannot read shows why in place of the automation.
 */
export function AutomationScreen(props: {
  state: AutomationState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const mobile = viewport === 'mobile'
  const suspended = state.org === 'suspended'
  if (state.read !== 'ready') {
    return (
      <AutomationFrame state={state} viewport={viewport}>
        <AutomationNotShown
          read={state.read}
          suspended={suspended}
          viewport={viewport}
        />
      </AutomationFrame>
    )
  }
  const automation = automationOf(state)
  const access = accessOf(state, automation)
  const edits = editsOf(state.triggers, automation.triggers)
  const menu = state.triggers === 'menu'
  // A new automation has no runs yet, so a phone shows it without tabs.
  const runsTab = mobile && automation.saved && state.tab === 'runs'
  const links = flowLinks(state, automation)
  // Only the owner changes the secrets of the runs, so only the owner opens
  // the control (automation capabilities decision 1 A).
  const owner = access === 'owner'
  const dialog =
    state.dialog === 'delete' && !suspended ? (
      <DeleteAutomationDialog automation={automation} viewport={viewport} />
    ) : null
  const form = (
    <AutomationForm
      access={access}
      edits={edits}
      login={state.login}
      menu={menu}
      modelMenu={state.modelMenu === 'open'}
      automation={automation}
      capabilities={
        owner
          ? automationCapabilityControl(state, automation, viewport)
          : undefined
      }
      suspended={suspended}
      viewer={viewerOf(state)}
      viewport={viewport}
    />
  )
  const notice = suspended ? (
    <suspendedOrgNotice.Component
      moklyInstance="suspended-org-notice"
      org={{ name: orgs[suspendedOrg].name }}
    />
  ) : null
  const runs = (
    <RunsPanel
      links={suspended ? {} : runLinks}
      older={hasOlderRuns(state.runs)}
      automation={automation}
      runs={runLists[state.runs]}
      // A suspended org takes every action away, so no failed run offers one.
      viewer={suspended ? undefined : viewerOf(state)}
      viewport={viewport}
    />
  )
  return (
    <AutomationFrame
      overlay={
        mobile ? (
          <>
            <PhoneSheet edits={edits} menu={menu} />
            {owner ? automationCapabilitySheet(state, automation) : null}
            {dialog}
          </>
        ) : (
          dialog
        )
      }
      state={state}
      viewport={viewport}
    >
      <page.Component
        back={{
          label: 'Automations',
          to: suspended ? paths.suspendedAutomations : paths.automations,
        }}
        fill
        subtitle="Automation"
        title={titleOf(automation)}
        viewport={viewport}
        {...defined({
          // A member gets no actions, so the page has no bar of actions.
          actions:
            automationActions({
              automation,
              access,
              save: saveStateOf(state, automation),
              viewport,
              withForm: !runsTab,
              runNow: offersRunNow(edits.map((edit) => edit.trigger)),
              ...links,
            }) ?? undefined,
          tabs:
            mobile && automation.saved ? (
              <AutomationTabs
                automation={automation}
                suspended={suspended}
                tab={state.tab}
              />
            ) : undefined,
        })}
      >
        {mobile ? (
          <div className={styles.phoneScroll}>
            <div className={styles.phoneContent}>
              {notice}
              {runsTab ? runs : form}
              {!runsTab && access === 'owner' && automation.saved ? (
                <PhoneDelete to={links.deleteTo} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.formScroll}>
              <div className={styles.form}>
                {notice}
                {form}
              </div>
            </div>
            {runs}
          </div>
        )}
      </page.Component>
    </AutomationFrame>
  )
}
