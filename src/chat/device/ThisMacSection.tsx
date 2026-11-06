import type { ReactNode } from 'react'
import { CircleAlert, MonitorOff, Square } from 'lucide-react'
import type { DeviceSettings } from '../../shared/device'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import mac from '../../../docs/mockups/src/components/settings/ThisMacSection.module.css'
import type { FetchLike } from '../api/client'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import { timeLeft } from './command-text'
import local from './device.module.css'
import { useMacSettings, type MacSettingsController } from './mac-settings'

const DESCRIPTION =
  'Agents can ask to run commands on this Mac while it is awake and the app is open. Each command asks you first.'

/** The saved choices of this Mac: the exact commands, then the 15 minutes. */
function SavedChoices(props: {
  settings: DeviceSettings
  busy: readonly string[]
  now: number
  controller: MacSettingsController
}) {
  const { settings, busy, now, controller } = props
  const windows = settings.workspaceWindows.filter(
    (grant) => grant.expiresAt > now,
  )
  return (
    <>
      <DetailList rows={[{ term: 'Name', value: settings.deviceName }]} />
      <span className={mac.label}>Always allowed</span>
      {settings.alwaysAllowedCommands.length > 0 ? (
        <ul aria-label="Always allowed commands" className={mac.list}>
          {settings.alwaysAllowedCommands.map((command) => (
            <li className={mac.row} key={command}>
              <code className={local.command}>{command}</code>
              <ActionButton
                accessibilityLabel={`Remove ${command}`}
                busy={busy.includes(`command:${command}`)}
                onPress={() =>
                  void controller.change(`command:${command}`, {
                    action: 'remove-command',
                    command,
                  })
                }
                tone="plain"
              >
                Remove
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className={local.empty}>
          Always allow in a request adds its command here.
        </p>
      )}
      <span className={mac.label}>Allowed for 15 minutes</span>
      {windows.length > 0 ? (
        <ul aria-label="Workspaces allowed for 15 minutes" className={mac.list}>
          {windows.map((grant) => (
            <li className={mac.row} key={grant.workspaceId}>
              <span className={local.window}>{grant.workspaceName}</span>
              <span className={local.left}>
                {timeLeft(grant.expiresAt, now)} left
              </span>
              <ActionButton
                accessibilityLabel={`Stop ${grant.workspaceName}`}
                busy={busy.includes(`window:${grant.workspaceId}`)}
                icon={Square}
                onPress={() =>
                  void controller.change(`window:${grant.workspaceId}`, {
                    action: 'stop-workspace',
                    workspaceId: grant.workspaceId,
                  })
                }
              >
                Stop
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className={local.empty}>
          Allow all commands for 15 minutes in a request adds its workspace
          here.
        </p>
      )}
    </>
  )
}

/**
 * The Mac that the Mac app registers as a device (decision 62): its name,
 * its state, the commands that always run on it, each with Remove, and the
 * workspaces whose 15 minutes run, each with the time left and Stop. The
 * Mac keeps these choices, and the section reads and changes them through
 * the Worker. Mount it only in the Mac app, because a browser has no Mac.
 * Give it a stable `fetch`.
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
      <>
        <SavedChoices
          busy={state.busy}
          controller={controller}
          now={now}
          settings={state.settings}
        />
        {state.notice ? (
          <Notice
            body={state.notice}
            icon={CircleAlert}
            title="The Mac did not make the change"
            tone="danger"
          />
        ) : null}
      </>
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
    </Section>
  )
  if (props.viewport === 'desktop') return section
  return (
    <TouchScreen>
      <div className={local.phone}>{section}</div>
    </TouchScreen>
  )
}
