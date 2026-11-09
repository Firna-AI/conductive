import type { Viewport } from '@mokly/mokly'
import {
  Archive,
  Cloud,
  ListTree,
  PanelsTopLeft,
  SquarePlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { FeatureItem } from '../../../../../src/marketing/features'
import { classes } from '../common/classes'
import { SectionIntro } from './SectionIntro'
import styles from './FeatureGrid.module.css'

/** The lucide component of each icon that a smaller feature names. */
const icons: Readonly<Record<FeatureItem['icon'], LucideIcon>> = {
  cloud: Cloud,
  users: Users,
  'list-tree': ListTree,
  'square-plus': SquarePlus,
  'panels-top-left': PanelsTopLeft,
  archive: Archive,
}

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
          const Icon = icons[item.icon]
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
