import type { ReactNode } from 'react'
import { ExpandedPicture } from '../components/files/ExpandedPicture'
import { ReportPage } from '../components/files/ReportPage'
import { imageView } from '../entries/components/files/ImageView.mockup'
import { pictureZoomBar } from '../entries/components/files/PictureZoomBar.mockup'
import { CheckoutPicture, screenshotSize } from '../fixtures/pictures'
import { ExpandedPreview } from '../components/tools/ExpandedPreview'
import { previewTabLabel } from '../../../../src/ui/components/tools/previewCopy'
import { StorefrontPage } from '../components/tools/StorefrontPage'
import { branchPictures, contextFiles, splitPath } from '../fixtures/files'
import { detectedServers, openPort, previewUrl } from '../fixtures/previews'
import { reportUrl } from '../fixtures/reportFile'
import { paths } from '../paths'
import { openFile } from './workspaceFileTab'
import type { WorkspaceState } from './workspaceState'

/** The scale of the fitted screenshot in the large window. */
const windowScale = 0.5

/** checkout-mobile.png in its large window, fitted, over its zoom bar. */
function expandedPicture(): ReactNode {
  const name = splitPath(branchPictures.picture).name
  return (
    <ExpandedPicture closeTo={paths.image} title={name}>
      <imageView.Component
        bar={
          <pictureZoomBar.Component
            fitted
            moklyInstance="picture-zoom-bar"
            scale={windowScale}
          />
        }
        moklyInstance="image-view"
        size={screenshotSize}
      >
        <CheckoutPicture label={name} view="form" />
      </imageView.Component>
    </ExpandedPicture>
  )
}

/**
 * The page of the shown tab in its large window over the whole app, after
 * Expand: the picture of an image file, the page of the HTML report, or
 * else the page of the Preview tab of port 3000. Only the desktop has
 * Expand.
 */
export function expandedPage(state: WorkspaceState): ReactNode {
  if (openFile(state) === 'image') return expandedPicture()
  if (openFile(state) === 'html') {
    return (
      <ExpandedPreview
        closeTo={paths.html}
        href={reportUrl}
        title={splitPath(contextFiles.report).name}
      >
        <ReportPage />
      </ExpandedPreview>
    )
  }
  const server = detectedServers.find((each) => each.port === openPort)
  return (
    <ExpandedPreview
      closeTo={paths.preview}
      href={previewUrl}
      title={previewTabLabel(openPort, server)}
    >
      <StorefrontPage />
    </ExpandedPreview>
  )
}
