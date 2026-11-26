import {
  buildLimit,
  endedBuild,
  failedBuild,
  runningBuild,
  timedOutBuild,
  waitingBuild,
  type Build,
  type FailedBuild,
} from '../../fixtures/computer'
import type { TerminalLine } from '../../fixtures/terminal'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { terminalView } from '../../entries/components/tools/TerminalView.mockup'
import {
  buildHistory,
  buildResult,
} from '../../entries/components/settings/BuildHistory.mockup'
import { buildOf } from './BuildHistory'
import { sectionText } from '../../entries/components/settings/Section.mockup'
import styles from '../../../../../src/ui/components/settings/BuildSection.module.css'

/**
 * The state of the cloud computer: built, building, failed, stopped at the
 * 60-minute limit of a build, or with no build yet, such as a new org
 * whose first build did not start. `waiting` is a build that waits for
 * another update of the cloud computer, which members do not see, such as
 * the switch build of an operator. The tab knows no state for a wait, so it
 * shows a build that runs, and the first line of its log names the wait.
 * `ended` is a build that an operator ended for such an update. The tab
 * shows it as a failed build, with its saved message.
 */
export type BuildState =
  'ready' | 'building' | 'waiting' | 'failed' | 'time-limit' | 'ended' | 'none'

/** The states whose card shows the log of a build. */
type LogState = 'building' | 'waiting' | 'failed' | 'time-limit' | 'ended'

/** A build runs, as the tab shows it. A build that waits shows as one that runs. */
export function buildRuns(state: BuildState): state is 'building' | 'waiting' {
  return state === 'building' || state === 'waiting'
}

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
    case 'ended':
      return endedBuild
    case 'ready':
    case 'building':
    case 'waiting':
    case 'none':
      return undefined
  }
}

function Log(props: { lines: readonly TerminalLine[]; live: boolean }) {
  return (
    <div className={styles.log}>
      <terminalView.Component
        cursor={props.live}
        extraKeys={false}
        lines={props.lines}
        moklyInstance="build-log"
      />
    </div>
  )
}

/** The action of the build head. A member who is not an admin gets none. */
function HeadAction(props: { state: BuildState; readOnly: boolean }) {
  if (props.readOnly) return null
  switch (props.state) {
    case 'building':
    case 'waiting':
      return (
        <actionButton.Component
          disabled
          icon="hammer"
          moklyInstance="build-action"
        >
          Build computer
        </actionButton.Component>
      )
    case 'failed':
    case 'time-limit':
    case 'ended':
      return (
        <actionButton.Component
          icon="rotate-cw"
          moklyInstance="build-action"
          tone="primary"
        >
          Try again
        </actionButton.Component>
      )
    case 'none':
      return (
        <actionButton.Component
          icon="hammer"
          moklyInstance="build-action"
          tone="primary"
        >
          Build computer
        </actionButton.Component>
      )
    case 'ready':
      return (
        <actionButton.Component icon="hammer" moklyInstance="build-action">
          Build computer
        </actionButton.Component>
      )
  }
}

function Head(props: { state: BuildState; builds: OrgBuilds }) {
  if (buildRuns(props.state)) {
    const { elapsed } = props.state === 'waiting' ? waitingBuild : runningBuild
    return (
      <statusText.Component
        busy
        label={`Building · ${elapsed}`}
        moklyInstance="build-state"
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
      <buildResult.Component
        build={buildOf(build)}
        id="last"
        moklyInstance="last-build"
      />
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
        <sectionText.Component moklyInstance="first-build-note" muted>
          Workspaces start from the first build.
        </sectionText.Component>
      </div>
    )
  }
  if (buildRuns(state)) {
    return (
      <div className={styles.body}>
        <Log lines={builds.logs[state]} live />
        <sectionText.Component moklyInstance="building-note" muted>
          {buildingNote(builds.lastGood)}
        </sectionText.Component>
      </div>
    )
  }
  const failed = failedBuildOf(state)
  if (!failed) return null
  const log: LogState =
    state === 'time-limit' || state === 'ended' ? state : 'failed'
  return (
    <div className={styles.body}>
      <sectionText.Component moklyInstance="build-error">
        {failed.error}
      </sectionText.Component>
      <Log lines={builds.logs[log]} live={false} />
      {builds.lastGood ? (
        <sectionText.Component moklyInstance="last-good-note" muted>
          {`Workspaces still start from the build of ${builds.lastGood.when}.`}
        </sectionText.Component>
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
        <buildHistory.Component
          builds={builds.history.map(buildOf)}
          moklyInstance="history"
          open={state === 'ready' && props.changeWaits !== true}
        />
      )}
    </section>
  )
}
