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
 * The kind of a file name. A file is code when the code view gives it
 * syntax colours, so one list of languages sets both the colours and the
 * icon, also for names such as `Dockerfile` and `.env.local`.
 */
export function fileKind(name: string): FileKind {
  if (isMarkdown(name)) return 'markdown'
  return languageOf(name) === null ? 'file' : 'code'
}
