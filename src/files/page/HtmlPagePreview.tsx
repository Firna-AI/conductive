import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, Maximize2, RotateCw } from 'lucide-react'
import { LogoTile } from '../../ui/components/brand/Logo'
import { htmlPreviewCopy } from '../../ui/components/files/htmlPreviewCopy'
import { PageFrame } from '../../ui/components/files/PageFrame'
import {
  expandedPreviewCopy,
  previewOpenFailedCopy,
  previewOpeningCopy,
} from '../../ui/components/tools/previewCopy'
import opening from '../../ui/screens/PreviewOpeningScreen.module.css'
import { ActionButton, IconButton } from '../ui/actions'
import { EmptyState } from '../ui/EmptyState'
import type { HtmlPreview } from './html-preview'

/**
 * The look of the launch page while a preview opens, as
 * `PreviewOpeningScreen` of the mockups draws it: the logo tile, a turning
 * ring, and "Opening preview". The page draws it until the frame exists,
 * and then the launch page in the frame shows the same look. It has no
 * `main` of its own, because it sits inside the main part of the app.
 */
function OpeningLook() {
  const theme = useSharedUiTheme()
  return (
    <div className={opening.page}>
      <LogoTile size={40} />
      <div className={opening.status} role="status">
        <div className={opening.line}>
          <Spinner
            accessibilityLabel={previewOpeningCopy.opening}
            color={theme.colors.muted}
            size={16}
          />
          <span aria-hidden>{previewOpeningCopy.opening}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * The Preview of an HTML file in place of its text, as `app/files/html` of
 * the mockups draws it: the wait, the page in its frame from edge to edge,
 * the failure of a Preview tab with Try again, or the notice of older
 * software. A kept frame, which the shell shows under the page, draws
 * nothing here, but it must render to put the page into the kept frames.
 */
export function HtmlPageBody(props: { preview: HtmlPreview }) {
  const { view, reload } = props.preview
  switch (view.kind) {
    case 'opening':
      return (
        <PageFrame>
          <OpeningLook />
        </PageFrame>
      )
    case 'page':
      return view.kept ? view.frame : <PageFrame>{view.frame}</PageFrame>
    case 'failed':
      return (
        <EmptyState
          action={
            <ActionButton onPress={reload}>
              {previewOpenFailedCopy.retry}
            </ActionButton>
          }
          alert
          body={view.message}
          icon={CircleAlert}
          title={previewOpenFailedCopy.title}
        />
      )
    case 'older-software':
      return (
        <EmptyState
          body={htmlPreviewCopy.olderSoftwareBody}
          icon={RotateCw}
          title={htmlPreviewCopy.olderSoftwareTitle}
        />
      )
  }
}

/**
 * Reload, Expand, and Open of the page in the header, while the page opens
 * or shows, as the bar of a Preview tab has them. Open waits for the files
 * preview. Expand shows only on desktop, while the page shows.
 */
export function HtmlPageActions(props: { preview: HtmlPreview }) {
  const { expand } = props.preview
  return (
    <>
      <IconButton
        icon={RotateCw}
        label="Reload"
        onPress={props.preview.reload}
      />
      {expand ? (
        <IconButton
          icon={Maximize2}
          label={expandedPreviewCopy.expand}
          onPress={expand}
        />
      ) : null}
      {props.preview.open}
    </>
  )
}
