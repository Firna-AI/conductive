import { languageOf } from './languages'

/**
 * The kind of a file by its name, which sets its icon in All files, the
 * tabs, the list of `@`, and the file chips: a Markdown file, a code file,
 * or another file.
 */
export type FileKind = 'markdown' | 'code' | 'file'

/** A Markdown file, which shows rendered until the user asks for its source. */
export function isMarkdown(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path)
}

/**
 * An HTML file: a name that ends with `.html` or `.htm`, in any case. Its
 * tab shows the page in a frame until the user asks for its source. It
 * keeps the kind and the icon of code, because the code view colours it.
 */
export function isHtml(path: string): boolean {
  return /\.html?$/i.test(path)
}

/**
 * An HTML file whose tab can show its page. The files preview serves no dot
 * file, a file whose own name starts with a dot, so the tab of such a file
 * shows only its source.
 */
export function showsAsPage(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return isHtml(path) && !name.startsWith('.')
}

/**
 * The kind of a file name. A file is code when the code view gives it
 * syntax colours, so one list of languages sets both the colours and the
 * icon, also for names such as `Dockerfile` and `.env.local`.
 */
export function fileKind(name: string): FileKind {
  if (isMarkdown(name)) return 'markdown'
  return languageOf(name) === null ? 'file' : 'code'
}
