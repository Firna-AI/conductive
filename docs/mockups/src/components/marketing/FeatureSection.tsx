import type { Viewport } from '@mokly/mokly'
import { classes } from '../common/classes'
import {
  ScreenFrame,
  type FrameDevice,
  type ScreenPicture,
} from './ScreenFrame'
import { SectionIntro } from './SectionIntro'
import styles from './FeatureSection.module.css'

/** One feature of the app: what it does, and a real screen that shows it. */
export type Feature = {
  key: string
  label: string
  title: string
  text: string
  picture: ScreenPicture
  device: FrameDevice
  /** The picture runs off the bottom of its stage, as a tall phone does. */
  bleed?: boolean
}

/**
 * A section of the home page for one feature: the label, the headline, one
 * sentence, and the picture on a quiet stage.
 */
export function FeatureSection(props: {
  feature: Feature
  viewport: Viewport
}) {
  const { feature } = props
  const mobile = props.viewport === 'mobile'
  return (
    <section className={classes(styles.feature, mobile && styles.mobile)}>
      <SectionIntro
        label={feature.label}
        text={feature.text}
        title={feature.title}
        viewport={props.viewport}
      />
      <div className={classes(styles.stage, feature.bleed && styles.bleed)}>
        <ScreenFrame device={feature.device} picture={feature.picture} />
      </div>
    </section>
  )
}
