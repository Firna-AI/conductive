import type { MouseEvent } from 'react'
import { Plus, RotateCw, X } from 'lucide-react'
import type { Preview } from '../shared/previews'
import { ToolIconButton } from '../terminal/tool-parts/ToolButtons'
import { OpenInNewTab } from './PreviewFrame'
import styles from './PreviewToolbar.module.css'

/**
 * True for a plain left click. The browser keeps every other click, such as
 * Ctrl or middle click, which opens the address in a new tab.
 */
function plainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * The bar of the preview tool: a link tab for each preview, the button that
 * opens another port, and the actions of the preview in the frame.
 */
export function PreviewToolbar(props: {
  previews: readonly Preview[]
  /** The preview in the frame, or null while the form shows. */
  selected: Preview | null
  closing: boolean
  href: (previewId: string) => string
  onFollow: (previewId: string) => void
  onAdd: () => void
  onReload: () => void
  onClose: (preview: Preview) => void
}) {
  const { selected } = props
  return (
    <div className={styles.toolbar}>
      <nav aria-label="Previews" className={styles.tabs}>
        {props.previews.map((preview) => {
          const current = preview.id === selected?.id
          return (
            <a
              aria-current={current ? 'page' : undefined}
              className={
                current ? `${styles.tab} ${styles.current}` : styles.tab
              }
              href={props.href(preview.id)}
              key={preview.id}
              onClick={(event) => {
                if (!plainClick(event)) return
                event.preventDefault()
                props.onFollow(preview.id)
              }}
            >
              Port {preview.port}
            </a>
          )
        })}
      </nav>
      <ToolIconButton
        icon={Plus}
        label="Preview another port"
        onPress={props.onAdd}
        pressed={selected === null}
      />
      <span className={styles.spacer} />
      {selected ? (
        <>
          <ToolIconButton
            icon={RotateCw}
            label="Reload"
            onPress={props.onReload}
          />
          <OpenInNewTab preview={selected} />
          <ToolIconButton
            busy={props.closing}
            icon={X}
            label="Close preview"
            onPress={() => props.onClose(selected)}
          />
        </>
      ) : null}
    </div>
  )
}
