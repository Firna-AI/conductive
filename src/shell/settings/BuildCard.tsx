import { RotateCw } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import styles from '../../../docs/mockups/src/components/settings/BuildSection.module.css'
import type { ComputerModel } from '../../app/computer-model'
import { currentBuild, latestBuild } from '../../app/org-model'
import { useStore } from '../../app/store'
import { formatElapsed } from '../../app/time'
import type {
  BuildLogEvent,
  BuildsResponse,
  ImageBuild,
} from '../../shared/org-settings'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'
import { BuildLog } from './BuildLog'
import { BuildButton, BuildHistory, BuildResult } from './BuildParts'
import { LoadFailure } from '../ui/LoadFailure'
import { inSentence, useWhen } from './when'

const noEvents: readonly BuildLogEvent[] = []

/** The state of the newest build: its time and result, or its run time. */
function Head(props: { latest: ImageBuild; now: number; when: string }) {
  const { latest } = props
  if (latest.state === 'running') {
    const elapsed = formatElapsed(props.now - latest.startedAt)
    return <StatusText busy label={`Building · ${elapsed}`} tone="active" />
  }
  return (
    <>
      <span className={styles.label}>Last build</span>
      <span className={styles.when}>{props.when}</span>
      <BuildResult build={latest} />
    </>
  )
}

/** The action of an admin: Try again after a failed build, else Build computer. */
function HeadAction(props: { latest: ImageBuild; build: Action<[]> }) {
  if (props.latest.state !== 'failed') {
    return (
      <BuildButton
        action={props.build}
        running={props.latest.state === 'running'}
      />
    )
  }
  return (
    <ActionButton
      busy={props.build.pending}
      icon={RotateCw}
      onPress={() => props.build.run()}
      tone="primary"
    >
      Try again
    </ActionButton>
  )
}

/**
 * Which build new workspaces start from while a build runs or after it
 * failed. `since` is the time of the last good build, if there is one.
 */
function startsFrom(latest: ImageBuild, since: string | null): string | null {
  if (latest.state === 'running') {
    return since
      ? `Workspaces start from the build of ${since} until this one finishes.`
      : 'Workspaces start from this build when it finishes.'
  }
  return since ? `Workspaces still start from the build of ${since}.` : null
}

/** The card of an org whose computer has no build yet. */
function FirstBuild(props: { build: Action<[]> }) {
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>No build yet</span>
        <span className={styles.spacer} />
        <BuildButton action={props.build} running={false} tone="primary" />
      </div>
      <div className={styles.body}>
        <SectionText muted>Workspaces start from the first build.</SectionText>
      </div>
    </section>
  )
}

/**
 * The builds of the org's cloud computer, as an admin sees them: the newest
 * build with its result and Build computer or Try again, the log of a build
 * that runs or failed, and the history. The computer model chooses and
 * follows the log, so the card only shows it. A failed build leaves the
 * last good build in use (decision 9).
 */
export function BuildCard(props: {
  builds: BuildsResponse
  build: Action<[]>
  computer: ComputerModel
  /** A changed install script waits for a build, so the history stays closed. */
  needsBuild: boolean
}) {
  const latest = latestBuild(props.builds)
  const current = currentBuild(props.builds)
  const running = latest?.state === 'running'
  const { now, when } = useWhen(running ? 1_000 : 60_000)
  const log = useStore(props.computer.log)
  if (!latest) return <FirstBuild build={props.build} />
  const history = props.builds.builds
    .filter((build) => build.kind === 'build')
    .toSorted((a, b) => b.startedAt - a.startedAt)
  const note = startsFrom(
    latest,
    current ? inSentence(when(current.startedAt)) : null,
  )
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head latest={latest} now={now} when={when(latest.startedAt)} />
        <span className={styles.spacer} />
        <HeadAction build={props.build} latest={latest} />
      </div>
      {latest.state === 'succeeded' ? null : (
        <div className={styles.body}>
          {log?.error ? (
            <LoadFailure
              error={log.error}
              retry={() => props.computer.reloadLog()}
              title="The log did not load"
            />
          ) : (
            <BuildLog events={log?.events ?? noEvents} live={running} />
          )}
          {note ? <SectionText muted>{note}</SectionText> : null}
        </div>
      )}
      <BuildHistory
        builds={history}
        open={latest.state === 'succeeded' && !props.needsBuild}
        when={when}
      />
    </section>
  )
}
