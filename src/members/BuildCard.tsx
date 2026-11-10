import { ChevronRight, CircleAlert } from 'lucide-react'
import { changeWaits } from '../app/repository-changes'
import type {
  BuildLogEvent,
  BuildsResponse,
  ImageBuild,
} from '../shared/org-settings'
import { buildTime, formatDuration } from './time'
import { SectionText } from './ui/Section'
import { StatusText } from './ui/StatusText'
import styles from './BuildCard.module.css'

type Clock = { now: number; timeZone?: string }

function when(build: ImageBuild, clock: Clock): string {
  return buildTime(
    build.completedAt ?? build.startedAt,
    clock.now,
    clock.timeZone,
  )
}

function length(build: ImageBuild): string {
  const end = build.completedAt ?? build.startedAt
  return formatDuration(build.durationMs ?? end - build.startedAt)
}

function Result(props: { build: ImageBuild }) {
  if (props.build.state === 'failed') {
    return (
      <StatusText
        icon={CircleAlert}
        label={`Failed after ${length(props.build)}`}
        tone="danger"
      />
    )
  }
  return (
    <StatusText label={`Succeeded in ${length(props.build)}`} tone="success" />
  )
}

function Head(props: { newest: ImageBuild | undefined; clock: Clock }) {
  const { newest, clock } = props
  if (!newest) return <span className={styles.label}>No builds yet</span>
  if (newest.state === 'running') {
    const elapsed = formatDuration(clock.now - newest.startedAt)
    return <StatusText busy label={`Building · ${elapsed}`} tone="active" />
  }
  return (
    <>
      <span className={styles.label}>Last build</span>
      <span className={styles.when}>{when(newest, clock)}</span>
      <Result build={newest} />
    </>
  )
}

/** Where new workspaces start while a build runs or after it failed. */
function fallback(
  newest: ImageBuild,
  current: ImageBuild | undefined,
  clock: Clock,
): string {
  if (newest.state === 'running') {
    return current
      ? `Workspaces start from the build of ${when(current, clock)} until this one finishes.`
      : 'Workspaces can start when this build finishes.'
  }
  return current
    ? `Workspaces still start from the build of ${when(current, clock)}.`
    : 'Workspaces can start after a build succeeds.'
}

/** The log of a build, scrolled to its end. */
function Log(props: { log: readonly BuildLogEvent[] | null }) {
  if (props.log === null) {
    return <SectionText muted>The log of this build did not load.</SectionText>
  }
  return (
    <div className={styles.log}>
      <pre aria-label="Build log" className={styles.logText}>
        {props.log.map((event) => event.text).join('')}
      </pre>
    </div>
  )
}

/**
 * The builds of the org's cloud computer, read-only: the last build with
 * its result, the log of a build that runs or failed, and the history. A
 * refresh only fetches commits, so the card counts the runs of the install
 * script, as the tab of an admin does. A failed build leaves the last good
 * build in use. The history stays closed while a saved change of the
 * install script or of the repositories waits for a build. A member who is
 * not an admin gets no actions here, because only an admin builds.
 */
export function BuildCard(props: {
  builds: BuildsResponse
  /** The log of the newest build when it runs or failed; null if it failed to load. */
  log: readonly BuildLogEvent[] | null
  now: number
  timeZone?: string
}) {
  const clock: Clock = { now: props.now, timeZone: props.timeZone }
  const builds = [...props.builds.builds].sort(
    (first, second) => second.startedAt - first.startedAt,
  )
  const history = builds.filter((build) => build.kind === 'build')
  const newest = history.at(0)
  // New workspaces start from the current image, also when a refresh made it.
  const current = builds.find(
    (build) => build.id === props.builds.currentImageBuildId,
  )
  const finished = history.filter((build) => build.state !== 'running')
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head clock={clock} newest={newest} />
      </div>
      {newest && newest.state !== 'succeeded' ? (
        <div className={styles.body}>
          <Log log={props.log} />
          <SectionText muted>{fallback(newest, current, clock)}</SectionText>
        </div>
      ) : null}
      {finished.length > 0 ? (
        <details
          className={styles.history}
          open={newest?.state === 'succeeded' && !changeWaits(props.builds)}
        >
          <summary className={styles.summary}>
            <ChevronRight aria-hidden className={styles.chevron} size={14} />
            History ({finished.length})
          </summary>
          <ul aria-label="Builds" className={styles.builds}>
            {finished.map((build) => (
              <li className={styles.build} key={build.id}>
                <span className={styles.when}>{when(build, clock)}</span>
                <Result build={build} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
