import { actionButton } from '../entries/components/common/actions.mockup'
import { notice } from '../entries/components/common/Notice.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { type FirstBuildState, runningBuild } from '../fixtures/computer'
import { paths } from '../paths'
import { firstBuildCopy as copy } from '../../../../src/ui/screens/firstBuildCopy'
import { defined } from '../defined'

/** The time of the build that runs, which a narrow phone keeps on one line. */
const elapsed = runningBuild.elapsed.replaceAll(' ', '\u00a0')

/** The Cloud computer tab of the org, in the state of the notice. */
function ComputerLink(props: { to: string }) {
  return (
    <ScreenLink asChild to={props.to}>
      <actionButton.Component icon="arrow-right" moklyInstance="open-computer">
        {copy.settings}
      </actionButton.Component>
    </ScreenLink>
  )
}

/**
 * The notice over the composer of New workspace while the org has no good
 * image: its first build runs, failed, or never started. Send stays off
 * until a build succeeds, so no create fails for want of an image. Only an
 * admin builds and sets up the computer, so only an admin gets the link to
 * the Cloud computer tab, in each state, and a member reads who can act.
 */
export function FirstBuildNotice(props: {
  build: Exclude<FirstBuildState, 'succeeded'>
  admin: boolean
}) {
  const { admin } = props
  switch (props.build) {
    case 'running':
      return (
        <notice.Component
          body={copy.running.body}
          busy
          icon="hammer"
          moklyInstance="first-build"
          title={copy.running.title(elapsed)}
          {...defined({
            action: admin ? (
              <ComputerLink to={paths.firstBuildComputer} />
            ) : undefined,
          })}
        />
      )
    case 'failed':
      return (
        <notice.Component
          body={admin ? copy.failed.admin : copy.failed.member}
          icon="circle-alert"
          moklyInstance="first-build"
          title={copy.failed.title}
          tone="danger"
          {...defined({
            action: admin ? (
              <ComputerLink to={paths.firstBuildComputerFailed} />
            ) : undefined,
          })}
        />
      )
    case 'none':
      return (
        <notice.Component
          body={admin ? copy.none.admin : copy.none.member}
          icon="hammer"
          moklyInstance="first-build"
          title={copy.none.title}
          {...defined({
            action: admin ? (
              <ComputerLink to={paths.firstBuildComputerNoBuild} />
            ) : undefined,
          })}
        />
      )
  }
}
