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

function Head(props: { state: BuildState }) {
  switch (props.state) {
    case 'building':
      return (
        <>
          <StatusText
            busy
            label={`Building · ${runningBuild.elapsed}`}
            tone="active"
          />
          <span className={styles.spacer} />
          <ActionButton disabled icon={Hammer}>
            Build computer
          </ActionButton>
        </>
      )
    case 'failed':
      return (
        <>
          <span className={styles.label}>Last build</span>
          <span className={styles.when}>{failedBuild.when}</span>
          <Result build={failedBuild} />
          <span className={styles.spacer} />
          <ActionButton icon={RotateCw} tone="primary">
            Try again
          </ActionButton>
        </>
      )
    case 'ready':
    case 'changed':
      return (
        <>
          <span className={styles.label}>Last build</span>
          <span className={styles.when}>{lastBuild.when}</span>
          <Result build={lastBuild} />
          <span className={styles.spacer} />
          <ActionButton icon={Hammer}>Build computer</ActionButton>
        </>
      )
  }
}

/**
 * The builds of the org's cloud computer: the last build with its result,
 * Build computer, the log of a build that runs or failed, and the history.
 * A failed build leaves the last good build in use.
 */
export function BuildSection(props: { state: BuildState }) {
  const { state } = props
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head state={state} />
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
