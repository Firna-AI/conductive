import type { Viewport } from '@mokly/mokly'
import { changelogPageCopy } from '../../../../src/marketing/changelog-copy'
import type { ChangelogPost } from '../../../../src/marketing/changelog-model'
import { ChangelogIntro } from '../components/changelog/ChangelogIntro'
import { ChangelogPostView } from '../components/changelog/ChangelogPostView'
import { classes } from '../components/common/classes'
import { SitePage } from '../components/marketing/SitePage'
import styles from './ChangelogScreen.module.css'

/**
 * The changelog page of the site: the top, with the link to the releases on
 * GitHub, then one post for each day with a release, newest first. A page
 * without posts shows one line in their place. The header has no link to
 * the page, so it marks no section, and the footer links the page. The
 * words come from `src/marketing/changelog-copy.ts`, which holds the words
 * of the page for the site and the mockup. The column takes the width of the
 * site header, so the days line up with the wordmark.
 */
export function ChangelogScreen(props: {
  posts: readonly ChangelogPost[]
  viewport: Viewport
}) {
  const { posts, viewport } = props
  return (
    <SitePage viewport={viewport}>
      <div
        className={classes(styles.page, viewport === 'mobile' && styles.mobile)}
      >
        <ChangelogIntro viewport={viewport} />
        {posts.length > 0 ? (
          <div className={styles.posts}>
            {posts.map((post) => (
              <ChangelogPostView
                key={post.date}
                post={post}
                viewport={viewport}
              />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{changelogPageCopy.empty}</p>
        )}
      </div>
    </SitePage>
  )
}
