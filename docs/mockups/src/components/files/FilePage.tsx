import type { ReactNode } from 'react'
import { SegmentedControl } from '@firna/ui/segmented'
import { ChevronLeft, Code, Eye } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
import { noop } from '../../../../../src/ui/noop'
import { ScreenLink } from '../common/ScreenLink'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import type { BackLink } from '../layout/Page'
import { PreviewActions } from '../tools/PortPreview'
import { specFor } from './fileSpecs'
import type { FileTabView } from './FilesPanel'
import styles from './FilePage.module.css'

/** The switch between the rendered file and its source. */
function ViewSwitch(props: { value: 'preview' | 'source' }) {
  const { field } = useControlSizes()
  return (
    <SegmentedControl
      accessibilityLabel="Show"
      iconOnly
      onChange={noop}
      options={[
        { label: 'Preview', value: 'preview', icon: Eye },
        { label: 'Source', value: 'source', icon: Code },
      ]}
      size={field}
      value={props.value}
    />
  )
}

/** The page shows the diff of a changed file. */
function isDiff(view: FileTabView): boolean {
  return view === 'diff' || view === 'masked-diff'
}

/**
 * A file, a code preview, a picture, or a diff as a full page: a tab of the
 * centre column on desktop, and a page of the Files tab on a phone. The
 * header shows the label of the path, and the actions on the file. A file
 * whose name the app does not know shows "File". A file that is not text,
 * such as a picture, keeps Download, and its Copy is off. A Markdown or an
 * HTML file has the switch between Preview and Source at the end. The page
 * of an HTML file in a frame adds Reload, Expand on desktop, and Open
 * before Copy, as the bar of a Preview tab has them. A picture has its
 * zoom bar under it, with Expand on desktop. A narrow page, such as a phone, moves them to
 * a second line of the header, so the path keeps its room.
 *
 * `placeholder` shows in place of the content, such as the state of a
 * sandbox that starts. The page then reads nothing, so its header has no
 * Download, no Copy, no line count, and no Reload or Open. A diff keeps its
 * changed lines, which come from the list of changes.
 */
export function FilePage(props: {
  view: FileTabView
  back?: BackLink
  placeholder?: ReactNode
  /**
   * The screen of the page of an HTML file or of a picture in its large
   * window, which Expand shows. Only the centre of the desktop gives it.
   */
  expandTo?: string
}) {
  const spec = specFor(props.view, props.expandTo)
  const { folder, name } = splitPath(spec.path)
  const Icon = spec.icon
  const waiting = props.placeholder !== undefined
  const closed = spec.closed === true || waiting
  const meta = waiting && !isDiff(props.view) ? undefined : spec.meta
  const pageUrl = waiting ? undefined : spec.pageUrl
  return (
    <section aria-label={name} className={styles.page}>
      <div className={classes(styles.header, pageUrl && styles.framed)}>
        <div className={styles.start}>
          {props.back ? (
            <ScreenLink className={styles.back} to={props.back.to}>
              <ChevronLeft aria-hidden size={15} />
              <span className={styles.backLabel}>{props.back.label}</span>
            </ScreenLink>
          ) : null}
          <span className={styles.chip}>
            <Icon aria-hidden className={styles.icon} size={13} />
            {folder ? <span className={styles.folder}>{folder}/</span> : null}
            <span className={styles.name}>{name}</span>
          </span>
          {closed ? null : (
            <iconButton.Component
              icon="download"
              label={`Download ${name}`}
              moklyInstance="download-file"
            />
          )}
        </div>
        {pageUrl ? (
          <div className={styles.pageActions}>
            <PreviewActions expandTo={props.expandTo} href={pageUrl} />
          </div>
        ) : null}
        <div className={styles.end}>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
          <iconButton.Component
            disabled={closed || spec.binary === true}
            icon="copy"
            label={`Copy the text of ${name}`}
            moklyInstance="copy-file-text"
          />
          {spec.mode ? <ViewSwitch value={spec.mode} /> : null}
        </div>
      </div>
      <div className={styles.body}>{props.placeholder ?? spec.content}</div>
    </section>
  )
}
