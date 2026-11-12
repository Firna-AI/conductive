import type { ReactNode } from 'react'
import { SegmentedControl } from '@firna/ui/segmented'
import { ChevronLeft, Code, Copy, Download, Eye } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import type { BackLink } from '../layout/Page'
import { specFor } from './fileSpecs'
import type { FileTabView } from './FilesPanel'
import styles from './FilePage.module.css'

/** The switch between the rendered Markdown and its source. */
function ViewSwitch() {
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
      value="preview"
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
 * such as a picture, keeps Download, and its Copy is off.
 *
 * `placeholder` shows in place of the content, such as the state of a
 * sandbox that starts. The page then reads nothing, so its header has no
 * Download, no Copy, and no line count. A diff keeps its changed lines,
 * which come from the list of changes.
 */
export function FilePage(props: {
  view: FileTabView
  back?: BackLink
  placeholder?: ReactNode
}) {
  const spec = specFor(props.view)
  const { folder, name } = splitPath(spec.path)
  const Icon = spec.icon
  const waiting = props.placeholder !== undefined
  const closed = spec.closed === true || waiting
  const meta = waiting && !isDiff(props.view) ? undefined : spec.meta
  return (
    <section aria-label={name} className={styles.page}>
      <div className={styles.header}>
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
            <IconButton icon={Download} label={`Download ${name}`} />
          )}
        </div>
        <div className={styles.end}>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
          <IconButton
            disabled={closed || spec.binary === true}
            icon={Copy}
            label={`Copy the text of ${name}`}
          />
          {props.view === 'markdown' ? <ViewSwitch /> : null}
        </div>
      </div>
      <div className={styles.body}>{props.placeholder ?? spec.content}</div>
    </section>
  )
}
