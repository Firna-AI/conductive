import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { ActionButton } from '../components/common/actions'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { TerminalView } from '../components/tools/TerminalView'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { repositories } from '../fixtures/repositories'
import { baseSession, baseSessionPrompt } from '../fixtures/terminal'
import { paths } from '../paths'

/** A terminal on the base of a repository, to install software and save. */
export function InstallSoftwareScreen(props: { viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  const actions = (
    <>
      <MockLink asChild to={paths.settings}>
        <ActionButton>Cancel</ActionButton>
      </MockLink>
      <MockLink asChild to={paths.settings}>
        <ActionButton tone="primary">Save to base</ActionButton>
      </MockLink>
    </>
  )
  const page = (
    <Page
      actions={actions}
      back={{ label: 'Repository settings', to: paths.settings }}
      fill
      subtitle={`Base of ${repositories.storefront.name}`}
      title="Install software"
      viewport={props.viewport}
    >
      <TerminalView
        extraKeys={mobile}
        lines={baseSession}
        prompt={baseSessionPrompt}
      />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame sidebar={<Sidebar groups={workspaceGroups()} />}>{page}</AppFrame>
  )
}
