import type { ReactNode } from 'react'
import { CircleAlert, MonitorOff } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import type { FetchLike } from '../api/client'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import local from './device.module.css'
import { useMacSettings } from './mac-settings'
import { ChangeResults, SavedChoices } from './SavedChoices'

const DESCRIPTION =
  'Agents can ask to run commands on this Mac while it is awake and the app is open. Each command asks you first.'

/**
 * The Mac that the Mac app registers as a device (decision 62): its name,
 * its state, the commands that always run on it, each with Remove, and the
 * workspaces whose 15 minutes run, each with the time left and Stop. The
 * Mac keeps these choices, and the section reads and changes them through
 * the Worker. The result of the last change of each control stays under
 * them until its next change, also while the Mac is away. Mount it only in
 * the Mac app, because a browser has no Mac. Give it a stable `fetch`.
 */
export function ThisMacSection(props: {
  fetch: FetchLike
  viewport: 'desktop' | 'mobile'
  clock?: Clock
}) {
  const { controller, state } = useMacSettings(props.fetch)
  const ticking =
    state.kind === 'ready' && state.settings.workspaceWindows.length > 0
  const now = useNow(props.clock ?? systemClock, ticking)
  const retry = (
    <ActionButton onPress={() => void controller.load()}>
      Try again
    </ActionButton>
  )
  let status = <StatusText busy label="Loading" tone="neutral" />
  let body: ReactNode = null
  if (state.kind === 'ready') {
    status = <StatusText label="Available" tone="success" />
    body = (
      <SavedChoices
        busy={state.busy}
        controller={controller}
        now={now}
        settings={state.settings}
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
      description={DESCRIPTION}
      status={status}
      title="This Mac"
    >
      {body}
      <ChangeResults
        busy={state.busy}
        controller={controller}
        now={now}
        results={state.results}
        settings={state.kind === 'ready' ? state.settings : null}
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
