import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { sandboxNotAnswering } from '../../../docs/mockups/src/fixtures/previews'
import type { HtmlPageView, HtmlPreview } from '../page/html-preview'
import { splitPath } from '../navigation'
import { devPreviews, type DevPreview } from './dev-view'
import styles from './DevApp.module.css'

/**
 * The pages that the development server serves in place of the files
 * preview, by the path of their file. The fake API serves no preview
 * domain. Development only: the product build does not include `pages/`.
 */
const stubPages: ReadonlyMap<string, string> = new Map([
  ['.context/report.html', '/src/files/dev/pages/report.html'],
])

/** The page shows no files preview on the development page, so a show starts nothing. */
const showNothing = () => () => {}

/**
 * Stands in for the files preview of the shell on the development page:
 * the view that `?preview=` names, with a frame of the stub page of the
 * file, and Open in a new tab. Reload loads the stub again, and Try again
 * shows the page, as an open that works.
 */
export function useDevHtmlPreview(
  path: string,
  preview: DevPreview,
  onPreview: (preview: DevPreview) => void,
): HtmlPreview {
  const [reloads, setReloads] = useState(0)
  const stub = stubPages.get(path) ?? 'about:blank'
  const { name } = splitPath(path)
  const views: Readonly<Record<DevPreview, HtmlPageView>> = {
    page: {
      kind: 'page',
      kept: false,
      frame: (
        <iframe
          className={styles.stubFrame}
          key={reloads}
          sandbox="allow-scripts allow-same-origin"
          src={stub}
          title={`Preview of ${name}`}
        />
      ),
    },
    opening: { kind: 'opening' },
    failed: { kind: 'failed', message: sandboxNotAnswering },
    'older-software': { kind: 'older-software' },
  }
  return {
    view: views[preview],
    open:
      preview === 'page' ? (
        <a
          aria-label="Open in new tab"
          className={styles.openLink}
          href={stub}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open
          <ExternalLink aria-hidden size={12} />
        </a>
      ) : null,
    reload: () =>
      preview === 'page' ? setReloads(reloads + 1) : onPreview('page'),
    // The development page keeps no frames, so its page has no window.
    expand: null,
    show: showNothing,
  }
}

const labels: Readonly<Record<DevPreview, string>> = {
  page: 'Page',
  opening: 'Opening',
  failed: 'Failed',
  'older-software': 'Older software',
}

/** The controls of what the Preview of an HTML file shows. */
export function HtmlPreviewControls(props: {
  value: DevPreview
  onChange: (preview: DevPreview) => void
}) {
  return (
    <>
      <span>HTML preview:</span>
      {devPreviews.map((preview) => (
        <button
          aria-pressed={props.value === preview}
          key={preview}
          onClick={() => props.onChange(preview)}
          type="button"
        >
          {labels[preview]}
        </button>
      ))}
    </>
  )
}
