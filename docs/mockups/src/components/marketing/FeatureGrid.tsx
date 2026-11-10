import type { Viewport } from '@mokly/mokly'
import type { FeatureItem } from '../../../../../src/marketing/features'
import { classes } from '../common/classes'
import { SectionIntro } from './SectionIntro'
import { siteIcons } from './siteIcons'
import styles from './FeatureGrid.module.css'

/** A section of smaller features in a grid, under one headline. */
export function FeatureGrid(props: {
  label: string
  title: string
  text: string
  items: readonly FeatureItem[]
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <section className={classes(styles.section, mobile && styles.mobile)}>
      <SectionIntro
        label={props.label}
        text={props.text}
        title={props.title}
        viewport={props.viewport}
      />
      <ul className={styles.grid}>
        {props.items.map((item) => {
          const Icon = siteIcons[item.icon]
          return (
            <li className={styles.item} key={item.title}>
              <Icon aria-hidden className={styles.icon} size={16} />
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
