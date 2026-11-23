import type { ReactNode } from 'react'
import { CircleAlert, MonitorOff } from 'lucide-react'
import type { ApiClient } from '../../app/api/client'
import { Notice } from '../../ui/components/common/Notice'
import { StatusText } from '../../ui/components/common/StatusText'
import { TouchScreen } from '../../ui/components/common/touch'
import { Section, SectionText } from '../../ui/components/settings/Section'
import { thisMacDescription } from '../../ui/components/settings/thisMacCopy'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import local from './device.module.css'
import { useMacSettings } from './mac-settings'
import { ChangeResults, SavedChoices } from './SavedChoices'
import { shownSettings } from './settings-view'

/**
 * The Mac that the Mac app registers as a device (decision 62): its name,
 * its state, the commands that always run on it, each with Remove, and the
 * workspaces whose grant runs, each with the time left of its 15 minutes
 * or Until you stop, and Stop. The
 * Mac keeps these choices, and the section reads and changes them through
 * the Worker. The result of the last change of each control stays under
 * them until its next change, also while the Mac is away. After a read
 * again that failed, the section still shows the kept settings, with
 * Remove and Stop. Mount it only in the Mac app, because a browser has no
 * Mac. Give it a stable `client`.
 */
export function ThisMacSection(props: {
  /** The JSON client of the app. Keep it stable. */
  client: ApiClient
  viewport: 'desktop' | 'mobile'
  clock?: Clock
}) {
  const { controller, state } = useMacSettings(props.client)
  const shown = shownSettings(state)
  const ticking = shown !== null && shown.settings.workspaceWindows.length > 0
  const now = useNow(props.clock ?? systemClock, ticking)
  const retry = (
    <ActionButton onPress={() => void controller.load()}>
      Try again
    </ActionButton>
  )
  let status = <StatusText busy label="Loading" tone="neutral" />
  let body: ReactNode = null
  if (shown !== null) {
    status = <StatusText label="Available" tone="success" />
    body = (
      <SavedChoices
        busy={state.busy}
        controller={controller}
        now={now}
        settings={shown.settings}
      />
    )
  } else if (state.kind === 'unavailable') {
    status = (
      <StatusText icon={MonitorOff} label="Not available" tone="warning" />
    )
    body = (
      <SectionText muted>
        Agents can run commands here again once this Mac connects.
      </SectionText>
    )
  } else if (state.kind === 'failed') {
    status = <StatusText icon={CircleAlert} label="Not loaded" tone="danger" />
    body = (
      <Notice
        body={state.message}
        icon={CircleAlert}
        title="This Mac did not load"
        tone="danger"
      />
    )
  }
  const section = (
    <Section
      actions={
        state.kind === 'unavailable' || state.kind === 'failed'
          ? retry
          : undefined
      }
      description={thisMacDescription}
      status={status}
      title="This Mac"
    >
      {body}
      <ChangeResults
        busy={state.busy}
        controller={controller}
        now={now}
        results={state.results}
        settings={shown?.settings ?? null}
      />
    </Section>
  )
  if (props.viewport === 'desktop') return section
  return (
    <TouchScreen>
      <div className={local.phone}>{section}</div>
    </TouchScreen>
  )
}
