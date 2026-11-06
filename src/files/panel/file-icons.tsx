import { File, FileCode, FileDiff, FileText } from 'lucide-react'

const codeExtensions = new Set(
  `ts tsx mts cts js jsx mjs cjs json c h cc cpp hpp cs go java kt rs scala
  swift dart prisma py rb sh bash zsh sql css scss less html xml svg vue yml
  yaml toml`.split(/\s+/),
)

/** A Markdown file, which shows rendered until the user asks for its source. */
export function isMarkdown(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path)
}

function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1)
}

/** The icon of a file or of its diff: Markdown, code, or another file. */
export function FileIcon(props: {
  path: string
  diff?: boolean
  className?: string
  size: number
}) {
  const icon = {
    'aria-hidden': true,
    className: props.className,
    size: props.size,
  }
  if (props.diff) return <FileDiff {...icon} />
  if (isMarkdown(props.path)) return <FileText {...icon} />
  if (codeExtensions.has(extensionOf(props.path))) return <FileCode {...icon} />
  return <File {...icon} />
}
