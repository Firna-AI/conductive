import { ChevronRight, CircleAlert, Hammer, RotateCw } from 'lucide-react'
import {
  buildHistory,
  buildLimit,
  failedBuild,
  lastBuild,
  runningBuild,
  timedOutBuild,
  type Build,
  type FailedBuild,
} from '../../fixtures/computer'
import {
  buildLog,
  failedBuildLog,
  timedOutBuildLog,
  type TerminalLine,
} from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { TerminalView } from '../tools/TerminalView'
import { SectionText } from './Section'
import styles from './BuildSection.module.css'

/**
 * The state of the cloud computer: built, building, failed, stopped at the
 * 60-minute limit of a build, or with a saved script that the next build
 * runs.
 */
export type BuildState =
  'ready' | 'building' | 'failed' | 'time-limit' | 'changed'

/** The build that failed in a state, with its saved message, or none. */
export function failedBuildOf(state: BuildState): FailedBuild | undefined {
  switch (state) {
    case 'failed':
      return failedBuild
    case 'time-limit':
      return timedOutBuild
    case 'ready':
    case 'building':
    case 'changed':
      return undefined
  }
}

function Result(props: { build: Build }) {
  const { build } = props
  if (build.result === 'failed') {
    return (
      <StatusText
        icon={CircleAlert}
        label={`Failed after ${build.duration}`}
        tone="danger"
      />
    )
  }
  return <StatusText label={`Succeeded in ${build.duration}`} tone="success" />
}

function History(props: { open: boolean }) {
  return (
    <details className={styles.history} open={props.open}>
      <summary className={styles.summary}>
        <ChevronRight aria-hidden className={styles.chevron} size={14} />
        History ({buildHistory.length})
      </summary>
      <ul aria-label="Builds" className={styles.builds}>
        {buildHistory.map((build, index) => (
          <li className={styles.build} key={index}>
            <span className={styles.when}>{build.when}</span>
            <Result build={build} />
          </li>
        ))}
      </ul>
    </details>
  )
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
    case 'ready':
    case 'changed':
      return <ActionButton icon={Hammer}>Build computer</ActionButton>
  }
}

function Head(props: { state: BuildState }) {
  if (props.state === 'building') {
    return (
      <StatusText
        busy
        label={`Building · ${runningBuild.elapsed}`}
        tone="active"
      />
    )
  }
  const build = failedBuildOf(props.state) ?? lastBuild
  return (
    <>
      <span className={styles.label}>Last build</span>
      <span className={styles.when}>{build.when}</span>
      <Result build={build} />
    </>
  )
}

/**
 * The log and the notes of a build that runs or failed. A build that runs
 * names its time limit. A failed build shows the message that the app
 * saved for it, such as the 60-minute limit, above the end of its log.
 */
function Body(props: { state: BuildState }) {
  if (props.state === 'building') {
    return (
      <div className={styles.body}>
        <Log lines={buildLog} live />
        <SectionText muted>
          {`Workspaces start from the build of ${lastBuild.when} until this one finishes. ${buildLimit}`}
        </SectionText>
      </div>
    )
  }
  const failed = failedBuildOf(props.state)
  if (!failed) return null
  return (
    <div className={styles.body}>
      <SectionText>{failed.error}</SectionText>
      <Log
        lines={props.state === 'time-limit' ? timedOutBuildLog : failedBuildLog}
        live={false}
      />
      <SectionText muted>
        {`Workspaces still start from the build of ${lastBuild.when}.`}
      </SectionText>
    </div>
  )
}

/**
 * The builds of the org's cloud computer: the last build with its result,
 * Build computer, the log of a build that runs or failed, and the history.
 * A failed build leaves the last good build in use. `readOnly` drops the
 * actions, for a member who is not an admin (decision 57).
 */
export function BuildSection(props: { state: BuildState; readOnly?: boolean }) {
  const { state } = props
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head state={state} />
        <span className={styles.spacer} />
        <HeadAction readOnly={props.readOnly ?? false} state={state} />
      </div>
      <Body state={state} />
      <History open={state === 'ready'} />
    </section>
  )
}
