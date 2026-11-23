import type { ReactNode } from 'react'
import { CircleAlert, Maximize2, RotateCw } from 'lucide-react'
import page from '../../../ui/components/tools/PreviewPage.module.css'
import { expandedPreviewCopy } from '../../../ui/components/tools/previewCopy'
import type { Preview } from '../../../shared/generated/Preview'
import { OpenInNewTab, PreviewFrame } from '../../../previews/PreviewFrame'
import {
  ToolButton,
  ToolIconButton,
} from '../../../terminal/tool-parts/ToolButtons'
import {
  ToolMessage,
  ToolWaiting,
} from '../../../terminal/tool-parts/ToolStates'
import type { ToolError } from '../../../terminal/tool-parts/request'
import { ExpandableFrames, type ExpandedFrame } from './ExpandableFrames'

/**
 * The bar of a Preview tab, over its page: Reload, which loads the page
 * again, Expand, which shows the page in a large window over the whole
 * app, and Open, which opens the launch page of the preview in a new
 * browser tab. Only a Preview tab has this bar. Open waits for a preview,
 * and Expand for the page in its frame.
 */
function PreviewBar(props: {
  preview: Preview | null
  onReload: () => void
  onExpand: (() => void) | null
}) {
  return (
    <div className={page.bar}>
      <ToolIconButton icon={RotateCw} label="Reload" onPress={props.onReload} />
      {props.onExpand ? (
        <ToolIconButton
          icon={Maximize2}
          label={expandedPreviewCopy.expand}
          onPress={props.onExpand}
        />
      ) : null}
      {props.preview ? <OpenInNewTab preview={props.preview} /> : null}
    </div>
  )
}

/**
 * What a Preview tab shows in place of the chat: its bar, and while its
 * port has no preview yet, the wait of the open under the bar, or the
 * failure of the open or of the read of the list, with Try again. The page itself lives in `KeptPreviewFrames`, so it stays loaded
 * while another tab shows.
 */
export function PreviewTabPage(props: {
  port: number
  preview: Preview | null
  error: ToolError | null
  /** The read of the list failed, rather than the open of the port. */
  listFailed: boolean
  onReload: () => void
  /** Shows the page in its large window, or null while no page shows. */
  onExpand: (() => void) | null
}) {
  let state: ReactNode = null
  if (props.error) {
    state = (
      <ToolMessage
        action={<ToolButton onPress={props.onReload}>Try again</ToolButton>}
        alert
        body={props.error.message}
        icon={CircleAlert}
        title={
          props.listFailed
            ? "The previews couldn't load"
            : "The preview couldn't open"
        }
      />
    )
  } else if (!props.preview) {
    state = <ToolWaiting label={`Opening port ${props.port}`} />
  }
  return (
    <>
      <PreviewBar
        onExpand={props.onExpand}
        onReload={props.onReload}
        preview={props.preview}
      />
      {state ? <div className={page.page}>{state}</div> : null}
    </>
  )
}

/** One kept page: the port, its preview, and the count of its reloads. */
export interface KeptFrame {
  port: number
  preview: Preview
  reloads: number
}

/**
 * The pages of the Preview tabs, each in its frame. A page mounts at the
 * first show of its tab, and stays mounted and hidden while another tab
 * shows, so a return does not load it again. Only the page of `shown`
 * shows. A new preview of the port, or a reload, loads the page again.
 * With `expanded`, the page of `shown` shows in its large window.
 */
export function KeptPreviewFrames(props: {
  frames: readonly KeptFrame[]
  shown: number | null
  expanded: ExpandedFrame | null
}) {
  const visible = props.frames.some((frame) => frame.port === props.shown)
  if (props.frames.length === 0) return null
  return (
    <ExpandableFrames expanded={props.expanded} visible={visible}>
      {props.frames.map((frame) => (
        <div
          className={page.frame}
          hidden={frame.port !== props.shown}
          key={frame.port}
        >
          <PreviewFrame
            key={`${frame.preview.id}:${frame.reloads}`}
            preview={frame.preview}
          />
        </div>
      ))}
    </ExpandableFrames>
  )
}
