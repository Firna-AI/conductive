import { ArrowRight, CircleAlert, Hammer } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { type FirstBuildState, runningBuild } from '../fixtures/computer'
import { paths } from '../paths'
import { firstBuildCopy as copy } from './firstBuildCopy'

/** The time of the build that runs, which a narrow phone keeps on one line. */
const elapsed = runningBuild.elapsed.replaceAll(' ', '\u00a0')

/** The Cloud computer tab of the org, in the state of the notice. */
function ComputerLink(props: { to: string }) {
  return (
    <ScreenLink asChild to={props.to}>
      <ActionButton icon={ArrowRight}>{copy.open}</ActionButton>
    </ScreenLink>
  )
}

/**
 * The notice over the composer of New workspace while the org has no good
 * image: its first build runs, failed, or never started. Send stays off
 * until a build succeeds, so no create fails for want of an image. Only an
 * admin builds the computer, so only an admin gets the link to the Cloud
 * computer tab, and a member reads who can act.
 */
export function FirstBuildNotice(props: {
  build: Exclude<FirstBuildState, 'succeeded'>
  admin: boolean
}) {
  const { admin } = props
  switch (props.build) {
    case 'running':
      return (
        <Notice
          body={copy.running.body}
          busy
          icon={Hammer}
          title={copy.running.title(elapsed)}
        />
      )
    case 'failed':
      return (
        <Notice
          action={
            admin ? (
              <ComputerLink to={paths.firstBuildComputerFailed} />
            ) : undefined
          }
          body={admin ? copy.failed.admin : copy.failed.member}
          icon={CircleAlert}
          title={copy.failed.title}
          tone="danger"
        />
      )
    case 'none':
      return (
        <Notice
          action={
            admin ? (
              <ComputerLink to={paths.firstBuildComputerNoBuild} />
            ) : undefined
          }
          body={admin ? copy.none.admin : copy.none.member}
          icon={Hammer}
          title={copy.none.title}
        />
      )
  }
}
