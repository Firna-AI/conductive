import type { Viewport } from '@mokly/mokly'
import {
  changelogPageCopy,
  versionsText,
} from '../../../../../src/marketing/changelog-copy'
import {
  changelogSections,
  type ChangelogPost,
  type ChangelogSection,
} from '../../../../../src/marketing/changelog-model'
import { dayWords } from '../../../../../src/marketing/from-conductor/dates'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ChangelogPostView.module.css'

/** One section of a post: its name, and a list with one change on each line. */
function ChangeList(props: {
  section: ChangelogSection
  changes: readonly string[]
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionName}>
        {changelogPageCopy.sections[props.section]}
      </h3>
      <ul className={styles.changes}>
        {props.changes.map((change, index) => (
          <li key={index}>{change}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * One post of the changelog: its day, its title, its versions, its lead,
 * and its sections in the order New, Improved, and Fixed. A section without
 * changes is left out. The day is the id of the post, and the day links to
 * that address, so a visitor can copy the link of one day. A desktop shows
 * the day in a column of its own, and a phone shows it above the title.
 */
export function ChangelogPostView(props: {
  post: ChangelogPost
  viewport: Viewport
}) {
  const { post } = props
  const versions = versionsText(post.versions)
  return (
    <article
      className={classes(
        styles.post,
        props.viewport === 'mobile' && styles.mobile,
      )}
      id={post.date}
    >
      <div className={styles.side}>
        <ScreenLink
          className={styles.day}
          fragment={post.date}
          to={paths.changelog}
        >
          <time dateTime={post.date}>{dayWords(post.date, 'long')}</time>
        </ScreenLink>
      </div>
      <div className={styles.body}>
        <header className={styles.head}>
          <h2 className={styles.title}>{post.title}</h2>
          {versions ? <p className={styles.versions}>{versions}</p> : null}
        </header>
        {post.lead ? <p className={styles.lead}>{post.lead}</p> : null}
        {changelogSections.map((section) => {
          const changes = post.sections[section] ?? []
          return changes.length > 0 ? (
            <ChangeList changes={changes} key={section} section={section} />
          ) : null
        })}
      </div>
    </article>
  )
}
