import { StatusText } from '../../ui/components/common/StatusText'
import { SectionText } from '../../ui/components/settings/Section'
import styles from '../../ui/components/settings/BuildSection.module.css'
import type { ComputerModel } from '../../app/computer-model'
import { currentBuild } from '../../app/current-build'
import { latestBuild } from '../../app/org-model'
import { runningRefresh } from '../../app/latest-build'
import { changeWaits } from '../../app/repository-changes'
import { useStore } from '../../app/store'
import { formatElapsed } from '../../app/time'
import type {
  BuildLogEvent,
  BuildsResponse,
  ImageBuild,
} from '../../shared/org-settings'
import type { Action } from '../ui/useAction'
import { BuildLog } from './BuildLog'
import {
  BuildButton,
  BuildHistory,
  BuildResult,
  TryAgainButton,
} from './BuildParts'
import { LoadFailure } from '../ui/LoadFailure'
import { inSentence, useWhen } from './when'

const noEvents: readonly BuildLogEvent[] = []

/** The note of a refresh during which an admin selected Build computer. */
const requestedNote = (
  <SectionText>A build starts when this refresh ends.</SectionText>
)

/** The time limit of each build, which the Worker applies. */
const buildLimit = 'Each build has a 60-minute limit.'

/**
 * The state of the newest build: its time and result, or its run time. A
 * refresh that runs after a good build shows its run time instead.
 */
function Head(props: {
  latest: ImageBuild
  refresh: ImageBuild | undefined
  now: number
  when: string
}) {
  const { latest, refresh } = props
  if (latest.state === 'succeeded' && refresh) {
    const elapsed = formatElapsed(props.now - refresh.startedAt)
    return <StatusText busy label={`Refreshing · ${elapsed}`} tone="active" />
  }
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
  if (props.latest.state === 'failed') {
    return <TryAgainButton action={props.build} />
  }
  return (
    <BuildButton
      action={props.build}
      running={props.latest.state === 'running'}
    />
  )
}

/**
 * Which build new workspaces start from while a build runs or after it
 * failed. `since` is the time of the last good build, if there is one. A
 * build that runs also names its time limit.
 */
function startsFrom(latest: ImageBuild, since: string | null): string | null {
  if (latest.state === 'running') {
    const startsFromBuild = since
      ? `Workspaces start from the build of ${since} until this one finishes.`
      : 'Workspaces start from this build when it finishes.'
    return `${startsFromBuild} ${buildLimit}`
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
 * follows the log, so the card only shows it. A failed build shows the
 * message that the Worker saved for it, such as its time limit, above its
 * log. A failed build leaves the last good build in use. The history stays
 * closed while a saved change of the install script or of the repositories
 * waits for a build. A refresh that runs after a good build shows as
 * Refreshing. After a Build computer during a refresh, the card says that
 * the build starts when the refresh ends.
 */
export function BuildCard(props: {
  builds: BuildsResponse
  build: Action<[]>
  computer: ComputerModel
}) {
  const latest = latestBuild(props.builds)
  const current = currentBuild(props.builds)
  const refresh = runningRefresh(props.builds)
  const running = latest?.state === 'running'
  const { now, when } = useWhen(running || refresh ? 1_000 : 60_000)
  const log = useStore(props.computer.log)
  if (!latest) return <FirstBuild build={props.build} />
  const history = props.builds.builds
    .filter((build) => build.kind === 'build')
    .toSorted((a, b) => b.startedAt - a.startedAt)
  const requested = refresh?.buildRequested === true
  const note = startsFrom(
    latest,
    current ? inSentence(when(current.startedAt)) : null,
  )
  return (
    <section aria-label="Builds" className={styles.card}>
      <div className={styles.head}>
        <Head
          latest={latest}
          now={now}
          refresh={refresh}
          when={when(latest.startedAt)}
        />
        <span className={styles.spacer} />
        <HeadAction build={props.build} latest={latest} />
      </div>
      {latest.state === 'succeeded' ? (
        requested ? (
          <div className={styles.body}>{requestedNote}</div>
        ) : null
      ) : (
        <div className={styles.body}>
          {latest.state === 'failed' && latest.error ? (
            <SectionText>{latest.error}</SectionText>
          ) : null}
          {log?.error ? (
            <LoadFailure
              error={log.error}
              retry={() => props.computer.reloadLog()}
              title="The log did not load"
            />
          ) : (
            <BuildLog events={log?.events ?? noEvents} live={running} />
          )}
          {requested ? requestedNote : null}
          {note ? <SectionText muted>{note}</SectionText> : null}
        </div>
      )}
      <BuildHistory
        builds={history}
        open={latest.state === 'succeeded' && !changeWaits(props.builds)}
        when={when}
      />
    </section>
  )
}
