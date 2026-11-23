import { FileCode, RotateCw } from 'lucide-react'
import { contextFiles } from '../../fixtures/files'
import { sandboxNotAnswering } from '../../fixtures/previews'
import { reportSource, reportUrl } from '../../fixtures/reportFile'
import { PreviewOpeningScreen } from '../../screens/PreviewOpeningScreen'
import { EmptyState } from '../../../../../src/ui/components/common/EmptyState'
import { PreviewOpenFailure } from '../tools/PreviewOpenFailure'
import { CodeView } from './CodeView'
import type { FileSpec } from './fileSpecs'
import { htmlPreviewCopy } from '../../../../../src/ui/components/files/htmlPreviewCopy'
import { PageFrame } from '../../../../../src/ui/components/files/PageFrame'
import { ReportPage } from './ReportPage'

/**
 * The views of the tab of the HTML report: its page, its source, the wait
 * until its page loads, the notice of older cloud computer software, and a
 * preview that did not open.
 */
export type HtmlView =
  | 'html'
  | 'html-source'
  | 'html-opening'
  | 'html-older-software'
  | 'html-failed'

/**
 * The tab of the HTML report of the context folder in each of its views,
 * from option A of HTML preview decision 1. It has the switch of a Markdown
 * file, and it starts in Preview. Preview shows the page in a frame, with
 * Reload and Open in the header. From the press until the page loads, the
 * frame shows the page that `app/tools/preview-opening` draws. Source shows
 * the text in the colours of HTML, with its line count, as a code file
 * does. Older software shows a notice in place of the page. A failed open
 * shows the failure of a Preview tab. Neither has Reload or Open, because
 * no page loads, and Source still works.
 */
export function htmlSpec(view: HtmlView): FileSpec {
  const file = { path: contextFiles.report, icon: FileCode }
  switch (view) {
    case 'html':
      return {
        ...file,
        mode: 'preview',
        pageUrl: reportUrl,
        content: (
          <PageFrame>
            <ReportPage />
          </PageFrame>
        ),
      }
    case 'html-source':
      return {
        ...file,
        mode: 'source',
        meta: `${reportSource.split('\n').length} lines`,
        content: <CodeView code={reportSource} path={contextFiles.report} />,
      }
    case 'html-opening':
      return {
        ...file,
        mode: 'preview',
        pageUrl: reportUrl,
        content: (
          <PageFrame>
            <PreviewOpeningScreen state={{ state: 'opening' }} />
          </PageFrame>
        ),
      }
    case 'html-older-software':
      return {
        ...file,
        mode: 'preview',
        content: (
          <EmptyState
            body={htmlPreviewCopy.olderSoftwareBody}
            icon={RotateCw}
            title={htmlPreviewCopy.olderSoftwareTitle}
          />
        ),
      }
    case 'html-failed':
      return {
        ...file,
        mode: 'preview',
        content: <PreviewOpenFailure message={sandboxNotAnswering} />,
      }
  }
}
