import { ScreenLink } from '../../common/ScreenLink'
import { classes } from '../../common/classes'
import {
  docsGroups,
  guidesIn,
  type DocsGuide,
  type DocsGuideKey,
} from './docsGuides'
import styles from './DocsNav.module.css'

/**
 * One guide of the menu: a link to its page. A guide that the mockups do
 * not draw keeps its place and its look, without a link.
 */
function GuideItem(props: { guide: DocsGuide; current: boolean }) {
  const { guide, current } = props
  const className = classes(styles.item, current && styles.current)
  if (!guide.to) return <span className={className}>{guide.title}</span>
  return (
    <ScreenLink
      aria-current={current ? 'page' : undefined}
      className={className}
      to={guide.to}
    >
      {guide.title}
    </ScreenLink>
  )
}

/**
 * The guides of the docs in their groups, Start, Work, and Manage, with
 * the current page marked. The sidebar of a desktop and the docs menu of a
 * phone show it.
 */
export function DocsNav(props: { current: DocsGuideKey }) {
  return (
    <nav aria-label="Docs" className={styles.nav}>
      {docsGroups.map((group) => {
        const id = `docs-group-${group.toLowerCase()}`
        return (
          <div className={styles.group} key={group}>
            <span className={styles.heading} id={id}>
              {group}
            </span>
            <ul aria-labelledby={id} className={styles.list}>
              {guidesIn(group).map((guide) => (
                <li key={guide.key}>
                  <GuideItem
                    current={guide.key === props.current}
                    guide={guide}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
