import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { productName } from '../brand'
import { classes } from '../components/common/classes'
import { ClosingCall } from '../components/marketing/ClosingCall'
import { SitePage } from '../components/marketing/SitePage'
import { ParityBoard } from '../components/parity/ParityBoard'
import { ParityGuide } from '../components/parity/ParityGuide'
import { ParityIntro } from '../components/parity/ParityIntro'
import { ParityTable } from '../components/parity/ParityTable'
import { parityAreaKeys } from '../fixtures/conductorParity'
import { paths } from '../paths'
import styles from './FromConductorScreen.module.css'

/** The three layouts of the page that the design study compares. */
type ParityLayout = 'by-area' | 'by-status' | 'by-task'

/** The saved states of the task layout: the card that a visitor opened. */
export const taskLayoutSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['open'],
  properties: {
    /** The open card: none, as when the page loads, or the card of an area. */
    open: { enum: ['none', ...parityAreaKeys] },
  },
} as const

type TaskLayoutState = SchemaProps<typeof taskLayoutSchema>

/** The catalogue page of each layout, which its own anchors link to. */
const layoutPages: Readonly<Record<ParityLayout, string>> = {
  'by-area': paths.fromConductorByArea,
  'by-status': paths.fromConductorByStatus,
  'by-task': paths.fromConductorByTask,
}

/** The list of the page in one layout. */
function ParityList(props: {
  layout: ParityLayout
  open: TaskLayoutState['open']
  viewport: Viewport
}): ReactNode {
  const page = layoutPages[props.layout]
  if (props.layout === 'by-area') {
    return <ParityTable page={page} viewport={props.viewport} />
  }
  if (props.layout === 'by-status') {
    return <ParityBoard page={page} viewport={props.viewport} />
  }
  return <ParityGuide open={props.open} viewport={props.viewport} />
}

/**
 * The page of the site for people who move from Conductor Cloud: which of
 * its features work in the product today, which are on the way, and which
 * work differently. Each layout shows the same sample data in another
 * order and density, under the same top and above the same last call. The
 * task layout keeps a narrower column, because its cards hold no table.
 */
export function FromConductorScreen(props: {
  layout: ParityLayout
  viewport: Viewport
  open?: TaskLayoutState['open']
}) {
  const { layout, viewport } = props
  return (
    <SitePage viewport={viewport}>
      <div
        className={classes(
          styles.page,
          layout === 'by-task' && styles.narrow,
          viewport === 'mobile' && styles.mobile,
        )}
      >
        <ParityIntro viewport={viewport} />
        <ParityList
          layout={layout}
          open={props.open ?? 'none'}
          viewport={viewport}
        />
        <p className={styles.footnote}>
          {productName} is not affiliated with Conductor.
        </p>
        <ClosingCall
          signIn={paths.signIn}
          text="Sign up with GitHub, connect your repositories, and send the first task."
          title="Bring your next task."
          viewport={viewport}
        />
      </div>
    </SitePage>
  )
}
