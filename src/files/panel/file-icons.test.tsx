import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { FileIcon } from './file-icons'

/** The classes of the icon that `FileIcon` draws for a path. */
function iconOf(path: string, diff = false): string | undefined {
  const html = renderToStaticMarkup(
    <FileIcon diff={diff} path={path} size={14} />,
  )
  return html.match(/class="([^"]*)"/)?.[1]
}

it('draws the icon of the name at the end of a path from the one icon map, and the diff icon for a diff', () => {
  expect({
    dockerfile: iconOf('deploy/Dockerfile'),
    markdown: iconOf('docs/README.MD'),
    text: iconOf('docs/notes.txt'),
    diff: iconOf('src/app.ts', true),
  }).toEqual({
    dockerfile: 'lucide lucide-file-code',
    markdown: 'lucide lucide-file-text',
    text: 'lucide lucide-file',
    diff: 'lucide lucide-file-diff',
  })
})
