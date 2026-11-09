import { Hammer, RotateCw } from 'lucide-react'
import {
  buildLimit,
  failedBuild,
  runningBuild,
  timedOutBuild,
  type Build,
  type FailedBuild,
} from '../../fixtures/computer'
import type { TerminalLine } from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { TerminalView } from '../tools/TerminalView'
import { BuildHistory, BuildResult } from './BuildHistory'
import { SectionText } from './Section'
import styles from './BuildSection.module.css'

/**
 * The state of the cloud computer: built, building, failed, stopped at the
 * 60-minute limit of a build, or with no build yet, such as a new org
 * whose first build did not start.
 */
export type BuildState = 'ready' | 'building' | 'failed' | 'time-limit' | 'none'

/** The states whose card shows the log of a build. */
type LogState = 'building' | 'failed' | 'time-limit'

/** The log of the build that runs or failed, in each state with a log. */
type BuildLogs = Readonly<Record<LogState, readonly TerminalLine[]>>

/**
 * The builds of an org that the card shows: the newest good build, which
 * every workspace starts from, the builds that ended, newest first, and
 * the logs. A new org has no good build until its first build succeeds.
 */
export type OrgBuilds = {
  lastGood?: Build
  history: readonly Build[]
  logs: BuildLogs
}

/** The build that failed in a state, with its saved message, or none. */
export function failedBuildOf(state: BuildState): FailedBuild | undefined {
  switch (state) {
    case 'failed':
      return failedBuild
    case 'time-limit':
      return timedOutBuild
    case 'ready':
    case 'building':
    case 'none':
      return undefined
  }
}

function Log(props: { lines: readonly TerminalLine[]; live: boolean }) {
  return (
    <div className={styles.log}>
      <TerminalView cursor={props.live} extraKeys={false} lines={props.lines} />
    </div>
  )
}

/** The action of the build head. A member who is not an admin gets none. */
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

function Head(props: { state: BuildState; builds: OrgBuilds }) {
  if (props.state === 'building') {
    return (
      <StatusText
        busy
        label={`Building · ${runningBuild.elapsed}`}
        tone="active"
      />
    )
  }
  const build = failedBuildOf(props.state) ?? props.builds.lastGood
  if (props.state === 'none' || build === undefined) {
    return <span className={styles.label}>No build yet</span>
  }
  return (
    <>
      <span className={styles.label}>Last build</span>
      <span className={styles.when}>{build.when}</span>
      <BuildResult build={build} />
    </>
  )
}

/**
 * The note under the log of a build that runs: the build that workspaces
 * start from until it finishes, and the time limit of each build.
 */
function buildingNote(lastGood: Build | undefined): string {
  const from = lastGood
    ? `Workspaces start from the build of ${lastGood.when} until this one finishes.`
    : 'Workspaces start from this build when it finishes.'
  return `${from} ${buildLimit}`
}

/**
 * The log and the notes of a build that runs or failed. A build that runs
 * names its time limit. A failed build shows the message that the app
 * saved for it, such as the 60-minute limit, above the end of its log, and
 * the good build that workspaces still start from, if there is one.
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
        <SectionText muted>{buildingNote(builds.lastGood)}</SectionText>
      </div>
    )
  }
  const failed = failedBuildOf(state)
  if (!failed) return null
  const log: LogState = state === 'time-limit' ? 'time-limit' : 'failed'
  return (
    <div className={styles.body}>
      <SectionText>{failed.error}</SectionText>
      <Log lines={builds.logs[log]} live={false} />
      {builds.lastGood ? (
        <SectionText muted>
          {`Workspaces still start from the build of ${builds.lastGood.when}.`}
        </SectionText>
      ) : null}
    </div>
  )
}

/**
 * The builds of the org's cloud computer: the last build with its result,
 * Build computer, the log of a build that runs or failed, and the history.
 * A failed build leaves the last good build in use. An org with no build
 * shows Build computer first. `readOnly` drops the actions, for a member
 * who is not an admin (decision 57).
 */
export function BuildSection(props: {
  state: BuildState
  builds: OrgBuilds
  readOnly?: boolean
  /** A changed install script waits for a build, so the history stays closed. */
  scriptChanged?: boolean
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
          open={state === 'ready' && props.scriptChanged !== true}
        />
      )}
    </section>
  )
}
