import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { MarkdownView } from './MarkdownView'

function render(text: string): string {
  return renderToStaticMarkup(<MarkdownView text={text} />)
}

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

it('links only absolute http, https, and mailto addresses', () => {
  const cases = [
    [
      '[site](https://example.com/a?b=1)',
      '<a href="https://example.com/a?b=1" rel="noopener noreferrer" target="_blank">site</a>',
    ],
    [
      '<mailto:dev@example.com>',
      '<a href="mailto:dev@example.com" rel="noopener noreferrer" target="_blank">mailto:dev@example.com</a>',
    ],
    ['[run](javascript:alert(1))', '<p>run</p>'],
    ['[run](JaVaScRiPt:alert(1))', '<p>run</p>'],
    ['[page](data:text/html,hi)', '<p>page</p>'],
    ['[setup](docs/setup.md)', '<p>setup</p>'],
    ['[other](//evil.example/x)', '<p>other</p>'],
    ['![logo](https://example.com/logo.png)', '<p>logo</p>'],
    [
      '[ref]\n\n[ref]: https://example.com/ref',
      '<a href="https://example.com/ref" rel="noopener noreferrer" target="_blank">ref</a>',
    ],
  ] as const
  for (const [markdown, expected] of cases) {
    expect(render(markdown), markdown).toContain(expected)
  }
  expect(render('![logo](https://example.com/logo.png)')).not.toContain('<img')
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
