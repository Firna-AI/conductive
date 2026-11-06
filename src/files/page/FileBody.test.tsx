import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { parseMarkdown } from '../markdown/markdown-document'
import { fileText } from '../model/file-text'
import { ReadError } from '../ui/FileStates'
import { FileContent } from './FileBody'

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

it('shows the size and the limit that the backend sends, with Download', () => {
  const html = renderToStaticMarkup(
    <ReadError
      error={{ kind: 'too-large', sizeBytes: 3_407_872, limitBytes: 1_048_576 }}
      onDownload={noop}
      onRetry={noop}
      subject="file"
    />,
  )
  expect(text(html)).toBe(
    'Download this file to read it Files up to 1 MB open here. This one has 3.3 MB. Download',
  )
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
  const png = {
    path: 'public/hero.png',
    mediaType: 'image/png',
    sizeBytes: 8,
    encoding: 'base64',
    content: 'iVBORw0KGgo=',
  } as const
  const html = renderToStaticMarkup(
    <FileContent
      mode="preview"
      onDownload={noop}
      path={png.path}
      text={fileText(png)}
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
  expect(decoded).toEqual({ kind: 'text', text: '# Café\n\nThe *shop*.\n' })
  const preview = renderToStaticMarkup(
    <FileContent
      markdownParser={parseMarkdown}
      mode="preview"
      path="README.md"
      text={decoded}
    />,
  )
  expect(preview).toContain('<h1>Café</h1>')
  expect(preview).toContain('<em>shop</em>')
  const source = renderToStaticMarkup(
    <FileContent mode="source" path="README.md" text={decoded} />,
  )
  expect(source).not.toContain('<h1>')
  expect(text(source)).toBe('1 # Café 2 3 The *shop*.')
})
