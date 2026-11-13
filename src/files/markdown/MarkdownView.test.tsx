import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import textLink from '../../../docs/mockups/src/components/common/TextLink.module.css'
import { parseRoute, routes } from '../../app/router'
import { orgPath } from '../../shared/api'
import {
  LinkOpeningProvider,
  type LinkOpening,
} from '../../shell/ui/text-links'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { parseMarkdown } from './markdown-document'
import { MarkdownView } from './MarkdownView'

/** A static render, with the whole parse of the worker on this thread. */
function render(text: string): string {
  return renderToStaticMarkup(
    <MarkdownView parser={parseMarkdown} text={text} />,
  )
}

/**
 * The link opener of a workspace screen whose servers run: the app origin
 * of the tests, the check of the router for a page, and port previews.
 */
const opening: LinkOpening = {
  appOrigin: FAKE_ORIGIN,
  isAppPage: (url) =>
    parseRoute(url.pathname, url.search).screen !== 'not-found',
  open: () => {},
  ports: { href: (port) => `/preview/${port}`, open: () => {} },
}

/** A static render in a workspace screen, which opens the links. */
function renderInScreen(text: string): string {
  return renderToStaticMarkup(
    <LinkOpeningProvider value={opening}>
      <MarkdownView parser={parseMarkdown} text={text} />
    </LinkOpeningProvider>,
  )
}

/** The look and the title of the shared link part, for an address. */
const drawn = (address: string) => `class="${textLink.link}" title="${address}"`
const newTab = 'rel="noopener noreferrer" target="_blank"'

it('renders headings, a numbered list, and inline code', () => {
  const html = render(`# Storefront

## Getting started

1. Copy \`.env.example\` to \`.env.local\`.
2. Run \`npm ci\`, then \`npm run dev\`.
3. Open \`http://localhost:3000\`.
   - Use **Chrome** or *Firefox*.
`)
  expect(html).toContain('<h1>Storefront</h1>')
  expect(html).toContain('<h2>Getting started</h2>')
  const items = html.slice(html.indexOf('<ol>'), html.indexOf('</ol>'))
  expect(items.split('<li>').length - 1).toBe(4)
  expect(items).toMatch(/^<ol><li>Copy <code[^>]*>\.env\.example<\/code> to/)
  expect(items).toContain('<li>Run <code')
  expect(items).toContain(
    '<ul><li>Use <strong>Chrome</strong> or <em>Firefox</em>.</li></ul>',
  )
})

it('ends a list item at an unindented line after a code block or a table, as CommonMark does', () => {
  const html = render(
    [
      '1. Run this:',
      '',
      '   ```sh',
      '   npm ci',
      '   ```',
      'Done.',
      '- Sizes:',
      '',
      '  | Bundle | Size |',
      '  | --- | --- |',
      '  | checkout | 182 KB |',
      'That is all.',
    ].join('\n'),
  )
  expect(html).toContain('npm ci</pre></li></ol><p>Done.</p>')
  expect(html).toMatch(/<\/table><\/div><\/li><\/ul><p>That is all\.<\/p>/)
})

it('keeps lazy list lines as paragraph text and reads indented setext headings', () => {
  const cases = [
    ['- Foo\n===', '<ul><li>Foo\n===</li></ul>'],
    ['- Foo\n--', '<ul><li>Foo\n--</li></ul>'],
    ['- Foo\n  ===', '<ul><li><h1>Foo</h1></li></ul>'],
    ['- Foo\n  --', '<ul><li><h2>Foo</h2></li></ul>'],
    ['- Foo\n---', '<ul><li>Foo</li></ul><hr/>'],
  ] as const
  for (const [markdown, expected] of cases) {
    expect(render(markdown), markdown).toContain(expected)
  }
})

it('keeps a fence with an info string as one code block', () => {
  const html = render(
    '```bash\nnpm test\n# not a heading\n```\n\nAfter the tests.',
  )
  expect(html).toMatch(/<pre[^>]*>npm test\n# not a heading<\/pre>/)
  expect(html).toContain('<p>After the tests.</p>')
  expect(html).not.toContain('<h1>')
})

it('shows HTML of the file as text', () => {
  const html = render(
    'Hello <script>alert(1)</script>\n\n<img src=x onerror="alert(1)">',
  )
  expect(html).toContain('Hello &lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  expect(html).not.toMatch(/<script|<img/)
  // An unknown character reference stays as typed. A known one decodes.
  expect(render('&constructor; &toString; &copy;')).toContain(
    '<p>&amp;constructor; &amp;toString; ©</p>',
  )
})

it('links only absolute http, https, and mailto addresses, with the shared link part: a page of the app opens in the app, and every other link opens a new tab', () => {
  const agents = routes.accountTab('agents')
  const api = `${FAKE_ORIGIN}${orgPath(FAKE_IDS.org)}`
  const cases = [
    [
      '[site](https://example.com/a?b=1)',
      `<a ${drawn('https://example.com/a?b=1')} href="https://example.com/a?b=1" ${newTab}>site</a>`,
    ],
    // Chat text keeps the next three addresses as text. A file links them.
    [
      '<mailto:dev@example.com>',
      `<a ${drawn('mailto:dev@example.com')} href="mailto:dev@example.com" ${newTab}>mailto:dev@example.com</a>`,
    ],
    [
      '[login](https://dev:secret@example.com/)',
      `<a ${drawn('https://dev:secret@example.com/')} href="https://dev:secret@example.com/" ${newTab}>login</a>`,
    ],
    [`[api](${api})`, `<a ${drawn(api)} href="${api}" ${newTab}>api</a>`],
    [
      `[agents](${FAKE_ORIGIN}${agents})`,
      `<a ${drawn(`${FAKE_ORIGIN}${agents}`)} href="${agents}">agents</a>`,
    ],
    ['[run](javascript:alert(1))', '<p>run</p>'],
    ['[run](JaVaScRiPt:alert(1))', '<p>run</p>'],
    ['[page](data:text/html,hi)', '<p>page</p>'],
    ['[setup](docs/setup.md)', '<p>setup</p>'],
    ['[other](//evil.example/x)', '<p>other</p>'],
    ['![logo](https://example.com/logo.png)', '<p>logo</p>'],
    [
      '[ref]\n\n[ref]: https://example.com/ref',
      `<a ${drawn('https://example.com/ref')} href="https://example.com/ref" ${newTab}>ref</a>`,
    ],
  ] as const
  for (const [markdown, expected] of cases) {
    expect(renderInScreen(markdown), markdown).toContain(expected)
  }
  expect(renderInScreen('![logo](https://example.com/logo.png)')).not.toContain(
    '<img',
  )
})

it('keeps a link to a local address as a link that opens a new tab, also where the screen opens the preview of a port', () => {
  expect(
    renderInScreen('Open [the dev server](http://localhost:3000).'),
  ).toContain(
    `<a ${drawn('http://localhost:3000/')} href="http://localhost:3000/" ${newTab}>the dev server</a>`,
  )
})

it('renders a table, a quote, a rule, and a task list', () => {
  const html = render(`| Name | Count |
| :--- | ---: |
| a \\| b | 2 |

> Quoted

---

- [x] Done
- [ ] Open
`)
  expect(html).toContain('<th style="text-align:left">Name</th>')
  expect(html).toContain('<td style="text-align:left">a | b</td>')
  expect(html).toContain('<td style="text-align:right">2</td>')
  expect(html).toContain('<blockquote><p>Quoted</p></blockquote>')
  expect(html).toContain('<hr/>')
  expect(html.match(/type="checkbox"/g)).toHaveLength(2)
  expect(html).toContain('<input disabled="" type="checkbox" checked=""/>Done')
  expect(html).toContain('<input disabled="" type="checkbox"/>Open')
})

it('shows quotes nested deeper than the limit as text, without a stack overflow', () => {
  const html = render(`${'>'.repeat(20_000)} deep`)
  expect(html.split('<blockquote>').length - 1).toBe(16)
  expect(html).toContain('&gt;&gt;&gt;')
  expect(html).toContain(' deep</p>')
})

/** The header cells, body rows, and body cells of each rendered table. */
function tableSizes(html: string) {
  return html
    .split('<table>')
    .slice(1)
    .map((table) => {
      const head = table.slice(0, table.indexOf('</thead>'))
      const body = table.slice(
        table.indexOf('<tbody>'),
        table.indexOf('</tbody>'),
      )
      return {
        head: head.match(/<th[ >]/g)?.length ?? 0,
        rows: body.match(/<tr>/g)?.length ?? 0,
        cells: body.match(/<td[ >]/g)?.length ?? 0,
      }
    })
}

/** A render without its class names, which the CSS modules hash. */
function bare(html: string): string {
  return html.replace(/ class="[^"]*"/g, '')
}

/**
 * 1,202 bytes: 200 header cells, then 200 rows of one empty cell. Each row
 * gets 199 empty cells, so the table adds 39,800.
 */
const sparseTable = `${'a|'.repeat(200)}\n${'-|'.repeat(200)}\n${'|\n'.repeat(200)}`

it('fills the short rows of all tables of one file, also in a list and a quote, up to 65,536 empty cells, then shows the rest of the file as text', () => {
  // The second copy is in a quote in the first item of a list.
  const inItem = sparseTable
    .trimEnd()
    .split('\n')
    .map((line, index) => `${index === 0 ? '- ' : '  '}> ${line}`)
    .join('\n')
  const html = render(`${sparseTable}\n${inItem}\n- after\n`)
  // 25,736 empty cells remain for the quoted table: 129 rows of 199.
  expect(tableSizes(html)).toEqual([
    { head: 200, rows: 200, cells: 40_000 },
    { head: 200, rows: 129, cells: 25_800 },
  ])
  // The tail starts at the 130th row, and holds the later item.
  expect(html.match(/<li>/g)).toHaveLength(1)
  expect(bare(html)).toContain(
    `</ul><p>${'  &gt; |\n'.repeat(71)}- after</p></article>`,
  )
})

it('allows exactly 65,536 empty cells in one file, then shows the rest of the file as text, with no Markdown', () => {
  // Each row of one cell under 1,025 header cells adds 1,024 empty cells.
  const wide = `${'a|'.repeat(1_025)}\n${'-|'.repeat(1_025)}\n${'|\n'.repeat(65)}`
  const later = '| x | y |\n| - | - |\n| 1 | 2 |\n'
  const html = render(`${wide}\n${later}\n# After **this**\n`)
  expect(tableSizes(html)).toEqual([{ head: 1_025, rows: 64, cells: 65_600 }])
  expect(html).not.toContain('<h1>')
  expect(bare(html)).toContain(
    '</table></div><p>|\n\n| x | y |\n| - | - |\n| 1 | 2 |\n\n# After **this**</p></article>',
  )
  // Each file starts with the whole count.
  expect(tableSizes(render(`${later}| 3 |\n`))).toEqual([
    { head: 2, rows: 2, cells: 4 },
  ])
})
