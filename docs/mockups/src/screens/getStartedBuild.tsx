import type { ReactNode } from 'react'
import { actionButton } from '../entries/components/common/actions.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { statusText } from '../entries/components/common/StatusText.mockup'
import { sectionText } from '../entries/components/settings/Section.mockup'
import {
  failedBuild,
  type FirstBuildState,
  runningBuild,
} from '../fixtures/computer'
import { paths } from '../paths'
import { getStartedCopy as copy } from '../../../../src/ui/screens/getStartedCopy'
import styles from '../../../../src/ui/screens/GetStartedScreen.module.css'

/** The state of the first build, with its time while it runs. */
function BuildStatus(props: { build: FirstBuildState }) {
  const { computer } = copy
  switch (props.build) {
    case 'running':
      return (
        <statusText.Component
          busy
          label={computer.preparing(runningBuild.elapsed)}
          moklyInstance="first-build-state"
          tone="active"
        />
      )
    case 'succeeded':
      return (
        <statusText.Component
          label={computer.ready}
          moklyInstance="first-build-state"
          tone="success"
        />
      )
    case 'failed':
      return (
        <statusText.Component
          icon="circle-alert"
          label={computer.failed(failedBuild.duration)}
          moklyInstance="first-build-state"
          tone="danger"
        />
      )
    case 'none':
      return (
        <statusText.Component
          label={computer.none}
          moklyInstance="first-build-state"
          tone="muted"
        />
      )
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
        <sectionText.Component moklyInstance="build-error">
          {failedBuild.error}
        </sectionText.Component>
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
            <actionButton.Component
              icon="rotate-cw"
              moklyInstance="retry-build"
              tone="primary"
            >
              {computer.retry}
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={paths.firstBuildComputerFailed}>
            <actionButton.Component moklyInstance="build-log">
              {computer.log}
            </actionButton.Component>
          </ScreenLink>
        </>
      )
    case 'none':
      return (
        <ScreenLink asChild to={paths.getStartedPreparing}>
          <actionButton.Component
            icon="hammer"
            moklyInstance="start-build"
            tone="primary"
          >
            {computer.build}
          </actionButton.Component>
        </ScreenLink>
      )
  }
}
