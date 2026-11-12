import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { parseMarkdown } from '../markdown/markdown-document'
import { fileText } from '../model/file-text'
import { ReadError } from '../ui/FileStates'
import { FileContent } from './FileBody'
import { fileView } from './file-view'

const noop = () => {}

/** The visible text of rendered markup, with its character references read. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

it('shows the size and the limit that the backend sends, and the terminal in place of Download', () => {
  const cases = [
    ['file', 'Open this file in the terminal'],
    ['diff', 'See this diff in the terminal'],
  ] as const
  for (const [subject, title] of cases) {
    const html = renderToStaticMarkup(
      <ReadError
        error={{
          kind: 'too-large',
          sizeBytes: 3_407_872,
          limitBytes: 1_048_576,
        }}
        onRetry={noop}
        subject={subject}
      />,
    )
    expect(text(html), subject).toBe(
      `${title} Files up to 1 MB open here. This one has 3.3 MB.`,
    )
  }
})

it('offers Try again when a read fails', () => {
  const html = renderToStaticMarkup(
    <ReadError
      error={{ kind: 'failed', status: 503, code: 'file_unavailable' }}
      onRetry={noop}
      subject="diff"
    />,
  )
  expect(html).toContain('role="alert"')
  expect(text(html)).toBe("This diff didn't open Try again")
})

it('shows a file that is not text as a download', () => {
  // The first bytes of a WOFF2 font, which hold a NUL character.
  const font = {
    path: 'public/fonts/brand.woff2',
    mediaType: 'application/octet-stream',
    sizeBytes: 8,
    encoding: 'base64',
    content: 'd09GMgABAAA=',
  } as const
  const html = renderToStaticMarkup(
    <FileContent
      mode="preview"
      name="brand.woff2"
      onDownload={noop}
      path={font.path}
      view={fileView(font.path, font)}
    />,
  )
  expect(text(html)).toBe(
    'Download this file to open it It is a binary file. Download',
  )
})

it('starts Markdown rendered and shows its source as text with line numbers', () => {
  const readme = {
    path: 'README.md',
    mediaType: 'text/markdown',
    sizeBytes: 22,
    encoding: 'base64',
    content: btoa(
      '# Café\n\nThe *shop*.\n'.normalize('NFC').replace(/é/, 'Ã©'),
    ),
  } as const
  const decoded = fileText(readme)
  expect(decoded).toEqual({
    kind: 'text',
    text: '# Café\n\nThe *shop*.\n',
    viewText: '# Café\n\nThe *shop*.\n',
  })
  const preview = renderToStaticMarkup(
    <FileContent
      markdownParser={parseMarkdown}
      mode="preview"
      name="README.md"
      path="README.md"
      view={decoded}
    />,
  )
  expect(preview).toContain('<h1>Café</h1>')
  expect(preview).toContain('<em>shop</em>')
  const source = renderToStaticMarkup(
    <FileContent
      mode="source"
      name="README.md"
      path="README.md"
      view={decoded}
    />,
  )
  expect(source).not.toContain('<h1>')
  expect(text(source)).toBe('1 # Café 2 3 The *shop*.')
})
