import type { ReactNode } from 'react'
import { CircleAlert, Hammer, RotateCw } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { StatusText } from '../components/common/StatusText'
import { SectionText } from '../components/settings/Section'
import {
  failedBuild,
  type FirstBuildState,
  runningBuild,
} from '../fixtures/computer'
import { paths } from '../paths'
import { getStartedCopy as copy } from './getStartedCopy'
import styles from './GetStartedScreen.module.css'

/** The state of the first build, with its time while it runs. */
function BuildStatus(props: { build: FirstBuildState }) {
  const { computer } = copy
  switch (props.build) {
    case 'running':
      return (
        <StatusText
          busy
          label={computer.preparing(runningBuild.elapsed)}
          tone="active"
        />
      )
    case 'succeeded':
      return <StatusText label={computer.ready} tone="success" />
    case 'failed':
      return (
        <StatusText
          icon={CircleAlert}
          label={computer.failed(failedBuild.duration)}
          tone="danger"
        />
      )
    case 'none':
      return <StatusText label={computer.none} tone="muted" />
  }
}

/**
 * The cloud computer of the org, under its name in the org step: the first
 * build with its time, then ready, the failure with the message that the
 * app saved for the build, or no build, such as after a start that failed.
 */
export function OrgBuild(props: { build: FirstBuildState }) {
  return (
    <>
      <div className={styles.computer}>
        <span className={styles.computerLabel}>{copy.computer.label}</span>
        <BuildStatus build={props.build} />
      </div>
      {props.build === 'failed' ? (
        <SectionText>{failedBuild.error}</SectionText>
      ) : null}
    </>
  )
}

/**
 * The actions of the org step for the first build, if it has any. The
 * person of Get started created the org, so they are its admin. After a
 * failure, Try again starts the build again, and the log opens on the
 * Cloud computer tab. With no build, Build computer starts one.
 */
export function orgBuildActions(build: FirstBuildState): ReactNode {
  const { computer } = copy
  switch (build) {
    case 'running':
    case 'succeeded':
      return undefined
    case 'failed':
      return (
        <>
          <ScreenLink asChild to={paths.getStartedPreparing}>
            <ActionButton icon={RotateCw} tone="primary">
              {computer.retry}
            </ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.firstBuildComputerFailed}>
            <ActionButton>{computer.log}</ActionButton>
          </ScreenLink>
        </>
      )
    case 'none':
      return (
        <ScreenLink asChild to={paths.getStartedPreparing}>
          <ActionButton icon={Hammer} tone="primary">
            {computer.build}
          </ActionButton>
        </ScreenLink>
      )
  }
}
