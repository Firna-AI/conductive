import type { ReactNode } from 'react'
import { ReportPage } from '../components/files/ReportPage'
import { ExpandedPreview } from '../components/tools/ExpandedPreview'
import { previewTabLabel } from '../components/tools/previewCopy'
import { StorefrontPage } from '../components/tools/StorefrontPage'
import { contextFiles, splitPath } from '../fixtures/files'
import { detectedServers, openPort, previewUrl } from '../fixtures/previews'
import { reportUrl } from '../fixtures/reportFile'
import { paths } from '../paths'
import { openFile } from './workspaceFileTab'
import type { WorkspaceState } from './workspaceState'

/**
 * The page of the shown tab in its large window over the whole app, after
 * Expand: the page of the HTML report, or else the page of the Preview tab
 * of port 3000. Only the desktop has Expand.
 */
export function expandedPage(state: WorkspaceState): ReactNode {
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
