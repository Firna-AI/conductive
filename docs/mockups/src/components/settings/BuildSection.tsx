import { ChevronRight, CircleAlert, Hammer, RotateCw } from 'lucide-react'
import {
  buildHistory,
  failedBuild,
  lastBuild,
  runningBuild,
  type Build,
} from '../../fixtures/computer'
import { buildLog, failedBuildLog } from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import { StatusText } from '../common/StatusText'
import { TerminalView } from '../tools/TerminalView'
import { SectionText } from './Section'
import styles from './BuildSection.module.css'

/**
 * The state of the cloud computer: built, building, failed, or with a
 * saved script that the next build runs.
 */
export type BuildState = 'ready' | 'building' | 'failed' | 'changed'

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

function Log(props: { failed: boolean }) {
  return (
    <div className={styles.log}>
      <TerminalView
        cursor={!props.failed}
        extraKeys={false}
        lines={props.failed ? failedBuildLog : buildLog}
      />
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
  const build = props.state === 'failed' ? failedBuild : lastBuild
  return (
    <>
      <span className={styles.label}>Last build</span>
      <span className={styles.when}>{build.when}</span>
      <Result build={build} />
    </>
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
      {state === 'building' || state === 'failed' ? (
        <div className={styles.body}>
          <Log failed={state === 'failed'} />
          <SectionText muted>
            {state === 'building'
              ? `Workspaces start from the build of ${lastBuild.when} until this one finishes.`
              : `Workspaces still start from the build of ${lastBuild.when}.`}
          </SectionText>
        </div>
      ) : null}
      <History open={state === 'ready'} />
    </section>
  )
}
