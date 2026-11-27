import type { Viewport } from '@mokly/mokly'
import { classes } from '../components/common/classes'
import { SitePage } from '../components/marketing/SitePage'
import { BlocksGraphic } from '../components/marketing/worktreeSpace/BlocksGraphic'
import { GrowthGraphic } from '../components/marketing/worktreeSpace/GrowthGraphic'
import { LaptopGraphic } from '../components/marketing/worktreeSpace/LaptopGraphic'
import { MultiplierGraphic } from '../components/marketing/worktreeSpace/MultiplierGraphic'
import { RowsGraphic } from '../components/marketing/worktreeSpace/RowsGraphic'
import { TerminalGraphic } from '../components/marketing/worktreeSpace/TerminalGraphic'
import { WorktreeSection } from '../components/marketing/worktreeSpace/WorktreeSection'
import styles from './MarketingScreen.module.css'

/** The variations of the draft graphic, in the order of the catalogue. */
const worktreeSpaceVariations = {
  rows: RowsGraphic,
  terminal: TerminalGraphic,
  blocks: BlocksGraphic,
  laptop: LaptopGraphic,
  growth: GrowthGraphic,
  multiplier: MultiplierGraphic,
} as const

export type WorktreeSpaceVariation = keyof typeof worktreeSpaceVariations

/**
 * A draft section of the home page that shows why local worktrees fill a
 * disk, in one variation of its graphic, inside the header and the footer
 * of the site. The user chooses one variation before it joins the home
 * page.
 */
export function WorktreeSpaceScreen(props: {
  viewport: Viewport
  variation: WorktreeSpaceVariation
}) {
  const Graphic = worktreeSpaceVariations[props.variation]
  const mobile = props.viewport === 'mobile'
  return (
    <SitePage viewport={props.viewport}>
      <div className={classes(styles.sections, mobile && styles.mobile)}>
        <WorktreeSection viewport={props.viewport}>
          <Graphic mobile={mobile} />
        </WorktreeSection>
      </div>
    </SitePage>
  )
}
