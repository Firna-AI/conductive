import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { PanelLeft } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import responsive from './responsive.module.css'

/** The way to the workspace list while the window is too narrow for the sidebar. */
export function NarrowNav() {
  return (
    <span className={responsive.narrowOnly}>
      <MockLink asChild to={paths.shell}>
        <Button
          accessibilityLabel="Workspaces"
          icon={PanelLeft}
          onPress={noop}
          shape="square"
          tone="plain"
        />
      </MockLink>
    </span>
  )
}
