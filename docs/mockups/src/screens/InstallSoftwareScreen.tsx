import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { TerminalView } from '../components/tools/TerminalView'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { repositories } from '../fixtures/repositories'
import { baseSession, baseSessionPrompt } from '../fixtures/terminal'
import { noop } from '../noop'
import { paths } from '../paths'

/** A terminal on the base of a repository, to install software and save. */
export function InstallSoftwareScreen(props: { viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  const actions = (
    <>
      <MockLink asChild to={paths.settings}>
        <Button onPress={noop} tone="secondary">
          Cancel
        </Button>
      </MockLink>
      <MockLink asChild to={paths.settings}>
        <Button onPress={noop} tone="primary">
          Save to base
        </Button>
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
