import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { Feature } from '../../../../../src/marketing/features'
import { marketingPicture } from '../../screens/marketingPictures'
import { classes } from '../common/classes'
import { ScreenFrame } from './ScreenFrame'
import { SectionIntro } from './SectionIntro'
import styles from './FeatureSection.module.css'

/**
 * A section of the home page for one feature: the label, the headline, one
 * sentence, and the picture on a quiet stage. `children`, such as the
 * downloads of the Mac app, go between the sentence and the picture. `id`
 * names the section for a link from the header or the footer.
 */
export function FeatureSection(props: {
  feature: Feature
  viewport: Viewport
  id?: string
  children?: ReactNode
}) {
  const { feature, viewport } = props
  const mobile = viewport === 'mobile'
  const { picture, device } = marketingPicture(feature.picture, viewport)
  return (
    <section
      className={classes(styles.feature, mobile && styles.mobile)}
      id={props.id}
    >
      <SectionIntro
        label={feature.label}
        text={feature.text}
        title={feature.title}
        viewport={viewport}
      />
      {props.children}
      <div className={classes(styles.stage, feature.bleed && styles.bleed)}>
        <ScreenFrame device={device} picture={picture} />
      </div>
    </section>
  )
}
