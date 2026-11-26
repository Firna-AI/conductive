import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTouch } from '../common/touch'
import { moreFiles } from './lostCopy'
import styles from './TurnEnd.module.css'

/**
 * The chips that the end of a turn shows before its Show more button: a
 * long list would push the reply out of view.
 */
const turnFileLimit = { desktop: 8, phone: 5 } as const

/** The words of the button that shows the hidden chips: "Show 12 more". */
function showMoreFiles(count: number): string {
  return `Show ${count} more`
}

/**
 * The list of the files that a turn changed. It shows the first 8 chips on
 * desktop and the first 5 on a phone, then a button that shows the rest.
 * `renderChip` draws each file, so the mockups and the app keep their own
 * chips. `omittedFiles` counts the files that the runner did not list, as
 * plain text after the last chip. When the button opens the list, the focus
 * moves to the first chip that it showed, if that chip is a control.
 */
export function TurnFileList<File extends { path: string }>(props: {
  label: string
  files: readonly File[]
  omittedFiles: number
  renderChip: (file: File) => ReactNode
}) {
  const limit = useTouch() ? turnFileLimit.phone : turnFileLimit.desktop
  const [revealedAt, setRevealedAt] = useState<number | null>(null)
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (revealedAt === null) return
    const item = list.current?.children.item(revealedAt)
    item?.querySelector<HTMLElement>('a, button')?.focus()
  }, [revealedAt])
  const hidden =
    revealedAt !== null ? 0 : Math.max(props.files.length - limit, 0)
  const shown = hidden > 0 ? props.files.slice(0, limit) : props.files
  const more = props.omittedFiles
  return (
    <ul aria-label={props.label} className={styles.chips} ref={list}>
      {shown.map((file) => (
        <li key={file.path}>{props.renderChip(file)}</li>
      ))}
      {hidden > 0 ? (
        <li>
          <button
            aria-label={`Show ${hidden} more changed files`}
            className={styles.showMore}
            onClick={() => setRevealedAt(limit)}
            type="button"
          >
            {showMoreFiles(hidden)}
          </button>
        </li>
      ) : more > 0 ? (
        <li className={styles.more}>{moreFiles(more)}</li>
      ) : null}
    </ul>
  )
}
