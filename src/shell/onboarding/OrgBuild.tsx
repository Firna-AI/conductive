import type { ReactNode } from 'react'
import { CircleAlert, Hammer, RotateCw } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import { getStartedCopy } from '../../../docs/mockups/src/screens/getStartedCopy'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import type { FirstBuild } from '../../app/first-build'
import { formatDuration, formatElapsed, useNow } from '../../app/time'
import type { ImageBuild } from '../../shared/org-settings'
import { buildLength } from '../settings/BuildParts'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'

const copy = getStartedCopy.computer

/** The time of the build that runs, which moves on each second. */
function Preparing(props: { build: ImageBuild }) {
  const now = useNow(1_000)
  return (
    <StatusText
      busy
      label={copy.preparing(formatElapsed(now - props.build.startedAt))}
      tone="active"
    />
  )
}

/** The state of the first build, with its time while it runs. */
function BuildStatus(props: { first: FirstBuild }) {
  const { first } = props
  switch (first.state) {
    case 'running':
      return <Preparing build={first.build} />
    case 'succeeded':
      return <StatusText label={copy.ready} tone="success" />
    case 'failed':
      return (
        <StatusText
          icon={CircleAlert}
          label={copy.failed(formatDuration(buildLength(first.build)))}
          tone="danger"
        />
      )
    case 'none':
      return <StatusText label={copy.none} tone="muted" />
  }
}

/**
 * The cloud computer of the org, under its name in the org step: the first
 * build with its time, then ready, the failure with the message that the
 * app saved for the build, or no build, such as after a start that failed.
 */
export function OrgComputer(props: { first: FirstBuild }) {
  const { first } = props
  return (
    <>
      <div className={styles.computer}>
        <span className={styles.computerLabel}>{copy.label}</span>
        <BuildStatus first={first} />
      </div>
      {first.state === 'failed' && first.build.error ? (
        <SectionText>{first.build.error}</SectionText>
      ) : null}
    </>
  )
}

/**
 * The actions of an admin for the first build, if it has any. After a
 * failure, Try again starts the build again, and `openLog` opens its log
 * on the Cloud computer tab. With no build, Build computer starts one.
 * `build` is the start of a build, which both buttons share.
 */
export function orgBuildActions(
  first: FirstBuild,
  build: Action<[]>,
  openLog: () => void,
): ReactNode {
  switch (first.state) {
    case 'running':
    case 'succeeded':
      return undefined
    case 'failed':
      return (
        <>
          <ActionButton
            busy={build.pending}
            icon={RotateCw}
            onPress={() => build.run()}
            tone="primary"
          >
            {copy.retry}
          </ActionButton>
          <ActionButton onPress={openLog}>{copy.log}</ActionButton>
        </>
      )
    case 'none':
      return (
        <ActionButton
          busy={build.pending}
          icon={Hammer}
          onPress={() => build.run()}
          tone="primary"
        >
          {copy.build}
        </ActionButton>
      )
  }
}
