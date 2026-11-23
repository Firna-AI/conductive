import { previewPath } from '../../../../src/shared/previews'
import { appDomain } from '../../../../src/shared/brand'
import { contextFiles } from './files'
import { orgs } from './orgs'
import { checkoutAutocomplete } from './workspaces'

/**
 * The report that an agent wrote in the context folder as a web page: how
 * fast the checkout suggests addresses in the tests. Its script draws a bar
 * for each length of query. `ReportPage` draws the page as a browser shows
 * it, and `reportSource` is the text of the same file.
 */
export const report = {
  title: 'Address autocomplete report',
  date: 'Test run of 18 November 2026',
  summary: [
    'The tests typed 120 addresses into the checkout form.',
    '118 of them got a matching suggestion.',
  ],
  chartTitle: 'Time to first suggestion',
  note: 'Each time is the median of 30 queries.',
  /** Each length of query and its median time to a suggestion, in ms. */
  times: [
    { label: '3 characters', ms: 210 },
    { label: '4 characters', ms: 160 },
    { label: '5 characters', ms: 130 },
    { label: '6 or more', ms: 110 },
  ],
} as const

/** The rows of the times in the script of the page. */
const timeRows = report.times
  .map((time) => `      ['${time.label}', ${time.ms}],`)
  .join('\n')

/**
 * The text of `.context/report.html`. The page has its own styles, and its
 * script draws one bar of 1 px for each ms of a time.
 */
export const reportSource = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${report.title}</title>
  <style>
    body { margin: 32px; font: 15px/1.5 system-ui; color: #111827; }
    .meta, .note { color: #4b5563; }
    .row { display: flex; align-items: center; gap: 8px; }
    .label { width: 96px; color: #374151; }
    .bar { height: 12px; border-radius: 0 4px 4px 0; background: #2a78d6; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p class="meta">${report.date}</p>
  <p>${report.summary[0]}
    ${report.summary[1]}</p>
  <h2>${report.chartTitle}</h2>
  <!-- The script below draws one bar for each length of query. -->
  <div id="chart"></div>
  <p class="note">${report.note}</p>
  <script>
    const times = [
${timeRows}
    ]
    const chart = document.getElementById('chart')
    for (const [label, ms] of times) {
      const row = document.createElement('div')
      row.className = 'row'
      row.innerHTML =
        '<span class="label">' + label + '</span>' +
        '<span class="bar" style="width: ' + ms + 'px"></span>' +
        '<span>' + ms + ' ms</span>'
      chart.append(row)
    }
  </script>
</body>
</html>`

/**
 * The launch address of a preview of the open workspace, at the path of a
 * file. Its `path` query names the file, so the browser opens the page at
 * that path, from option A of HTML preview decision 3.
 */
function launchAt(previewId: string, path: string): string {
  const url = new URL(
    previewPath(orgs.acme.key, checkoutAutocomplete.key, previewId),
    `https://${appDomain}`,
  )
  url.searchParams.set('path', path)
  return url.href
}

/**
 * The launch address of the report in the files preview of the workspace,
 * which Open opens in a new tab.
 */
export const reportUrl = launchAt('preview-files', contextFiles.report)
