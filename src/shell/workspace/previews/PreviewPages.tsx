import type { ReactNode } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import page from '../../../../docs/mockups/src/components/tools/PreviewPage.module.css'
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

/**
 * The bar of a Preview tab, over its page: Reload, which loads the page
 * again, and Open, which opens the launch page of the preview in a new
 * browser tab. Only a Preview tab has this bar. Open waits for a preview.
 */
function PreviewBar(props: { preview: Preview | null; onReload: () => void }) {
  return (
    <div className={page.bar}>
      <ToolIconButton icon={RotateCw} label="Reload" onPress={props.onReload} />
      {props.preview ? <OpenInNewTab preview={props.preview} /> : null}
    </div>
  )
}

/**
 * What a Preview tab shows in place of the chat: its bar, and while its
 * port has no preview yet, the wait of the open or its failure under the
 * bar. The page itself lives in `KeptPreviewFrames`, so it stays loaded
 * while another tab shows.
 */
export function PreviewTabPage(props: {
  port: number
  preview: Preview | null
  error: ToolError | null
  onReload: () => void
}) {
  let state: ReactNode = null
  if (props.error) {
    state = (
      <ToolMessage
        action={<ToolButton onPress={props.onReload}>Try again</ToolButton>}
        alert
        body={props.error.message}
        icon={CircleAlert}
        title="The preview couldn't open"
      />
    )
  } else if (!props.preview) {
    state = <ToolWaiting label={`Opening port ${props.port}`} />
  }
  return (
    <>
      <PreviewBar onReload={props.onReload} preview={props.preview} />
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
 */
export function KeptPreviewFrames(props: {
  frames: readonly KeptFrame[]
  shown: number | null
}) {
  const visible = props.frames.some((frame) => frame.port === props.shown)
  if (props.frames.length === 0) return null
  return (
    <div className={page.page} hidden={!visible}>
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
    </div>
  )
}
