import type { ReactNode } from 'react'
import { ChevronLeft, Copy, Download } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { useTouch } from '../common/touch'
import type { BackLink } from '../layout/Page'
import { specFor } from './fileSpecs'
import type { FileTabView } from './FilesPanel'
import { ViewSwitch } from './ViewSwitch'
import styles from './FilePage.module.css'

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
 *
 * The switch at the end of the header changes the view of the tab in its
 * place: the changes of a changed file, or the current file. A Markdown
 * file shows its current state rendered or as its source. On a phone the
 * switch sits in its own bar below the header, with the names.
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
  const phone = useTouch()
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
          {spec.views && !phone ? <ViewSwitch {...spec.views} /> : null}
        </div>
      </div>
      {spec.views && phone ? <ViewSwitch {...spec.views} bar /> : null}
      <div className={styles.body}>{props.placeholder ?? spec.content}</div>
    </section>
  )
}
