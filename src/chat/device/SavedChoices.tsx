import { Square } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import type { DeviceSettings } from '../../shared/device'
import { nameLabel } from '../../shared/name-label'
import { ChangeOutcome } from '../../../docs/mockups/src/components/mac/ChangeOutcome'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import mac from '../../../docs/mockups/src/components/settings/ThisMacSection.module.css'
import { ActionButton } from '../ui/actions'
import { timeLeft } from '../../shared/transcript/command-words'
import type { SettingsChange } from './device-api'
import { LiteralText } from './LiteralText'
import local from './device.module.css'
import type { MacSettingsController } from './mac-settings'
import {
  controlOf,
  grantRuns,
  repeatable,
  repeatLabel,
  resultMessage,
  resultTitle,
  type ChangeResult,
} from './settings-results'

/**
 * The result of the last change of each control, the newest last. A result
 * stays until the next change of its control, also when the change took
 * its row away. Then Try again on the result repeats the change, through
 * the current pairing, while the Mac shows its settings.
 */
export function ChangeResults(props: {
  results: Readonly<Record<string, ChangeResult>>
  /** The settings that show, or null while the Mac shows none. */
  settings: DeviceSettings | null
  busy: readonly string[]
  now: number
  controller: MacSettingsController
}) {
  const { settings, busy, now, controller } = props
  const results = Object.values(props.results)
  if (results.length === 0) return null
  return (
    <div className={local.results}>
      {results.map((result) => {
        const command = result.change.action === 'remove-command'
        const key = controlOf(result.change)
        const repeat = repeatable(result, settings, now)
        return (
          <ChangeOutcome
            action={
              repeat ? (
                <ActionButton
                  accessibilityLabel={repeatLabel(result)}
                  busy={busy.includes(key)}
                  disabled={settings === null}
                  onPress={() => void controller.change(result.change)}
                >
                  Try again
                </ActionButton>
              ) : null
            }
            code={command}
            key={key}
            message={resultMessage(result)}
            status={result.outcome.status}
            subject={
              command ? (
                <LiteralText as="span" text={result.subject} />
              ) : (
                result.subject
              )
            }
            title={resultTitle(result)}
          />
        )
      })}
    </div>
  )
}

/**
 * The saved choices of this Mac: the exact commands, then the grants of the
 * workspaces, each with the time left of its 15 minutes or Until you stop.
 */
export function SavedChoices(props: {
  settings: DeviceSettings
  busy: readonly string[]
  now: number
  controller: MacSettingsController
}) {
  const { settings, busy, now, controller } = props
  const windows = settings.workspaceWindows.filter((grant) =>
    grantRuns(grant, now),
  )
  const control = (change: SettingsChange) => ({
    busy: busy.includes(controlOf(change)),
    onPress: () => void controller.change(change),
  })
  return (
    <>
      <DetailList rows={[{ term: 'Name', value: settings.deviceName }]} />
      <span className={mac.label}>Always allowed</span>
      {settings.alwaysAllowedCommands.length > 0 ? (
        <ul aria-label="Always allowed commands" className={mac.list}>
          {settings.alwaysAllowedCommands.map((command) => (
            <li className={mac.row} key={command}>
              <LiteralText className={local.command} text={command} />
              <ActionButton
                accessibilityLabel={`Remove ${command}`}
                {...control({ action: 'remove-command', command })}
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
      <span className={mac.label}>All commands allowed</span>
      {windows.length > 0 ? (
        <ul
          aria-label="Workspaces with all commands allowed"
          className={mac.list}
        >
          {windows.map((grant) => (
            <li className={mac.row} key={grant.workspaceId}>
              <span className={mac.workspace}>
                {nameLabel(grant.workspaceName)}
              </span>
              {grant.expiresAt === null ? (
                <span className={classes(mac.left, mac.open)}>
                  Until you stop
                </span>
              ) : (
                <span className={mac.left}>
                  {timeLeft(grant.expiresAt, now)} left
                </span>
              )}
              <ActionButton
                accessibilityLabel={`Stop ${nameLabel(grant.workspaceName)}`}
                {...control({
                  action: 'stop-workspace',
                  workspaceId: grant.workspaceId,
                })}
                icon={Square}
              >
                Stop
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className={local.empty}>
          Allow all commands in a request adds its workspace here.
        </p>
      )}
    </>
  )
}
