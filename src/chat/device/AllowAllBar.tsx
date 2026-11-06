import { Square, Timer } from 'lucide-react'
import type { DeviceWorkspaceWindow } from '../../shared/device'
import styles from '../../../docs/mockups/src/components/mac/AllowAllBar.module.css'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import { timeLeft } from './command-text'
import type { MacSettingsController, MacSettingsState } from './mac-settings'

/** The 15 minutes of one workspace on this Mac, while they run. */
export function runningWindow(
  state: MacSettingsState,
  workspaceId: string,
  now: number,
): DeviceWorkspaceWindow | null {
  if (state.kind !== 'ready') return null
  return (
    state.settings.workspaceWindows.find(
      (grant) => grant.workspaceId === workspaceId && grant.expiresAt > now,
    ) ?? null
  )
}

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking (decision 62): the time left of its 15 minutes, from
 * the end time that the Mac keeps, and Stop. It shows nothing at other
 * times. The app places it at the top of the workspace, and gives it the
 * settings of `useMacSettings`, whose `refresh` it calls after an answer.
 */
export function AllowAllBar(props: {
  controller: MacSettingsController
  state: MacSettingsState
  workspaceId: string
  clock?: Clock
}) {
  const { controller, state, workspaceId } = props
  const listed =
    state.kind === 'ready' &&
    state.settings.workspaceWindows.some(
      (grant) => grant.workspaceId === workspaceId,
    )
  const now = useNow(props.clock ?? systemClock, listed)
  const grant = runningWindow(state, workspaceId, now)
  if (state.kind !== 'ready' || grant === null) return null
  const key = `window:${workspaceId}`
  return (
    <section
      aria-label="Commands that run without asking"
      className={styles.bar}
    >
      <Timer aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        Every command from this workspace runs on this Mac without asking.
      </span>
      <span className={styles.left}>{timeLeft(grant.expiresAt, now)} left</span>
      <ActionButton
        busy={state.busy.includes(key)}
        icon={Square}
        onPress={() =>
          void controller.change(key, { action: 'stop-workspace', workspaceId })
        }
      >
        Stop
      </ActionButton>
    </section>
  )
}
