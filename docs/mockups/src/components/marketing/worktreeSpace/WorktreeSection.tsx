import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { classes } from '../../common/classes'
import featureStyles from '../FeatureSection.module.css'
import { SectionIntro } from '../SectionIntro'
import { worktreeSpaceCopy } from './worktreeSpace'
import styles from './WorktreeSection.module.css'

/**
 * A draft section of the home page on disk space: the label, the headline,
 * one sentence, a graphic on the quiet stage of a feature, and a footnote
 * that names the source of the sizes.
 */
export function WorktreeSection(props: {
  viewport: Viewport
  children: ReactNode
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <section
      className={classes(
        featureStyles.feature,
        styles.section,
        mobile && featureStyles.mobile,
      )}
    >
      <SectionIntro
        label={worktreeSpaceCopy.label}
        text={worktreeSpaceCopy.text}
        title={worktreeSpaceCopy.title}
        viewport={props.viewport}
      />
      <figure className={classes(featureStyles.stage, styles.stage)}>
        {props.children}
      </figure>
      <p className={styles.footnote}>{worktreeSpaceCopy.footnote}</p>
    </section>
  )
}
