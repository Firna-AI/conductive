import { ChevronRight, CircleAlert, Hammer } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/settings/BuildSection.module.css'
import { formatDuration } from '../../app/time'
import type { ImageBuild } from '../../shared/org-settings'
import { ActionButton, type ActionTone } from '../ui/actions'
import type { Action } from '../ui/useAction'

/** The length of a build that ended. */
function buildLength(build: ImageBuild): number {
  if (build.durationMs !== null) return build.durationMs
  return build.completedAt === null ? 0 : build.completedAt - build.startedAt
}

/** The result of a build: it runs, it succeeded in its length, or it failed. */
export function BuildResult(props: { build: ImageBuild }) {
  const { build } = props
  switch (build.state) {
    case 'running':
      return <StatusText busy label="Building" tone="active" />
    case 'failed':
      return (
        <StatusText
          icon={CircleAlert}
          label={`Failed after ${formatDuration(buildLength(build))}`}
          tone="danger"
        />
      )
    case 'succeeded':
      return (
        <StatusText
          label={`Succeeded in ${formatDuration(buildLength(build))}`}
          tone="success"
        />
      )
  }
}

/** The builds of the computer, newest first, each with its time and result. */
export function BuildHistory(props: {
  builds: readonly ImageBuild[]
  open: boolean
  when: (time: number) => string
}) {
  return (
    <details className={styles.history} open={props.open}>
      <summary className={styles.summary}>
        <ChevronRight aria-hidden className={styles.chevron} size={14} />
        {`History (${props.builds.length})`}
      </summary>
      <ul aria-label="Builds" className={styles.builds}>
        {props.builds.map((build) => (
          <li className={styles.build} key={build.id}>
            <span className={styles.when}>{props.when(build.startedAt)}</span>
            <BuildResult build={build} />
          </li>
        ))}
      </ul>
    </details>
  )
}

/**
 * Build computer, which only an admin sees. It waits while a build runs,
 * because a build replaces the image only when it succeeds.
 */
export function BuildButton(props: {
  action: Action<[]>
  running: boolean
  tone?: ActionTone
}) {
  return (
    <ActionButton
      busy={props.action.pending}
      disabled={props.running}
      icon={Hammer}
      onPress={() => props.action.run()}
      tone={props.tone}
    >
      Build computer
    </ActionButton>
  )
}
