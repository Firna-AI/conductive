import { Hammer, RotateCw } from 'lucide-react'
import type { Build, FailedBuild } from '../../fixtures/computer'
import type { TerminalLine } from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { TerminalView } from '../tools/TerminalView'
import {
  lastJobLabel,
  runningLabels,
  runningNote,
  stillStartsFrom,
  type JobKind,
} from './buildCopy'
import { BuildHistory, BuildResult } from './BuildHistory'
import { SectionText } from './Section'
import styles from './BuildSection.module.css'

/**
 * The state of the newest job of the cloud computer, a build or a refresh:
 * done, running, failed, stopped at the 60-minute limit of a job, or no
 * build yet, such as a new org whose first build did not start.
 */
export type BuildState = 'ready' | 'building' | 'failed' | 'time-limit' | 'none'

/** The states of a newest job that failed. */
type FailedState = 'failed' | 'time-limit'

/** The states whose card shows the log of a job. */
type LogState = 'building' | FailedState

/** The log of the job that runs or failed, in each state with a log. */
type BuildLogs = Readonly<Record<LogState, readonly TerminalLine[]>>

/**
 * The jobs of an org that the card shows: the newest good job, which every
 * workspace starts from, the jobs that ended, newest first, and the logs.
 * `failed` holds the failed job of the head in each failed state, with its
 * saved message: the newest job, or a failed build that a good refresh
 * followed. `running` holds the kind and the time of the job that runs. A
 * new org has no good job until its first build succeeds.
 */
export type OrgBuilds = {
  lastGood?: Build
  history: readonly Build[]
  logs: BuildLogs
  failed: Readonly<Record<FailedState, FailedBuild>>
  running: { kind: JobKind; elapsed: string }
}

/** Whether a job failed, or the app stopped it at its 60-minute limit. */
export function isFailed(state: BuildState): state is FailedState {
  return state === 'failed' || state === 'time-limit'
}

function Log(props: { lines: readonly TerminalLine[]; live: boolean }) {
  return (
    <div className={styles.log}>
      <TerminalView cursor={props.live} extraKeys={false} lines={props.lines} />
    </div>
  )
}

/**
 * The action of the build head. Build computer waits while a build or a
 * refresh runs, because one job runs at a time. Try again follows a failed
 * build or refresh, and builds the current settings. A member who is not
 * an admin gets none.
 */
function HeadAction(props: { state: BuildState; readOnly: boolean }) {
  if (props.readOnly) return null
  switch (props.state) {
    case 'building':
      return (
        <ActionButton disabled icon={Hammer}>
          Build computer
        </ActionButton>
      )
    case 'failed':
    case 'time-limit':
      return (
        <ActionButton icon={RotateCw} tone="primary">
          Try again
        </ActionButton>
      )
    case 'none':
      return (
        <ActionButton icon={Hammer} tone="primary">
          Build computer
        </ActionButton>
      )
    case 'ready':
      return <ActionButton icon={Hammer}>Build computer</ActionButton>
  }
}

/**
 * The job on the head: the job that runs, and its time, or a job that
 * ended, a build or a refresh, with its result.
 */
function Head(props: { state: BuildState; builds: OrgBuilds }) {
  const { state, builds } = props
  if (state === 'building') {
    const { kind, elapsed } = builds.running
    return (
      <StatusText
        busy
        label={`${runningLabels[kind]} · ${elapsed}`}
        tone="active"
      />
    )
  }
  const job = isFailed(state) ? builds.failed[state] : builds.lastGood
  if (state === 'none' || job === undefined) {
    return <span className={styles.label}>No build yet</span>
  }
  return (
    <>
      <span className={styles.label}>{lastJobLabel(job.kind)}</span>
      <span className={styles.when}>{job.when}</span>
      <BuildResult build={job} />
    </>
  )
}

/**
 * The log and the notes of a job that runs or failed. A job that runs
 * names its time limit. A failed job shows the message that the app saved
 * for it, such as the 60-minute limit, above the end of its log, and the
 * good job that workspaces still start from, if there is one.
 */
function Body(props: { state: BuildState; builds: OrgBuilds }) {
  const { state, builds } = props
  if (state === 'none') {
    return (
      <div className={styles.body}>
        <SectionText muted>Workspaces start from the first build.</SectionText>
      </div>
    )
  }
  if (state === 'building') {
    return (
      <div className={styles.body}>
        <Log lines={builds.logs.building} live />
        <SectionText muted>
          {runningNote(builds.running.kind, builds.lastGood)}
        </SectionText>
      </div>
    )
  }
  if (!isFailed(state)) return null
  return (
    <div className={styles.body}>
      <SectionText>{builds.failed[state].error}</SectionText>
      <Log lines={builds.logs[state]} live={false} />
      {builds.lastGood ? (
        <SectionText muted>{stillStartsFrom(builds.lastGood)}</SectionText>
      ) : null}
    </div>
  )
}

/**
 * The jobs of the org's cloud computer: the last build or refresh with its
 * result, Build computer, the log of a job that runs or failed, and the
 * history of builds and refreshes. A failed job leaves the last good job in
 * use. An org with no build shows Build computer first. `readOnly` drops
 * the actions, for a member who is not an admin (decision 57).
 */
export function BuildSection(props: {
  /**
   * The state of the job on the head: the newest job, or a failed build
   * that no newer build replaced, after a good refresh.
   */
  state: BuildState
  builds: OrgBuilds
  readOnly?: boolean
  /**
   * A saved change of the install script or of the repositories waits for
   * a build, so the history stays closed.
   */
  changeWaits?: boolean
}) {
  const { state, builds } = props
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head builds={builds} state={state} />
        <span className={styles.spacer} />
        <HeadAction readOnly={props.readOnly ?? false} state={state} />
      </div>
      <Body builds={builds} state={state} />
      {state === 'none' ? null : (
        <BuildHistory
          builds={builds.history}
          open={state === 'ready' && props.changeWaits !== true}
        />
      )}
    </section>
  )
}
