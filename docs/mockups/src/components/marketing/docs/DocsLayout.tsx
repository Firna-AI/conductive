import type { Viewport } from '@mokly/mokly'
import { classes } from '../../common/classes'
import { guideWithNeighbours } from './docsGuides'
import type { DocsPage } from './docsPage'
import { DocsContents } from './DocsContents'
import { DocsMenu } from './DocsMenu'
import { DocsNav } from './DocsNav'
import { DocsPager } from './DocsPager'
import prose from './DocsProse.module.css'
import styles from './DocsLayout.module.css'

/** What a phone shows open: nothing, the docs menu, or the contents. */
type DocsOpen = 'none' | 'menu' | 'contents'

/**
 * A page of the docs inside the site: the guides, the title with its group
 * and lead, the contents of the page, the body, and the neighbouring
 * guides. A desktop shows the guides in a sidebar and the contents in a
 * column beside the body, or under the lead in a narrower window. A phone
 * shows the docs menu under the header of the site, and the contents as a
 * disclosure under the lead. Neither runs a script.
 */
export function DocsLayout(props: {
  page: DocsPage
  open: DocsOpen
  viewport: Viewport
}) {
  const { page, open } = props
  const mobile = props.viewport === 'mobile'
  const { guide, previous, next } = guideWithNeighbours(page.guide)
  return (
    <>
      {mobile ? <DocsMenu current={guide.key} open={open === 'menu'} /> : null}
      <div className={classes(styles.docs, mobile && styles.mobile)}>
        {mobile ? null : (
          <div className={styles.side}>
            <DocsNav current={guide.key} />
          </div>
        )}
        <header className={styles.head}>
          <span className={styles.label}>{guide.group}</span>
          <h1 className={styles.title}>{guide.title}</h1>
          <p className={styles.lead}>{page.lead}</p>
        </header>
        <div className={styles.contents}>
          <DocsContents
            layout={mobile ? 'disclosure' : 'list'}
            open={open === 'contents'}
            sections={page.sections}
          />
        </div>
        <div className={classes(styles.body, prose.prose)}>{page.body}</div>
        <div className={styles.pager}>
          <DocsPager next={next} previous={previous} stack={mobile} />
        </div>
      </div>
    </>
  )
}
