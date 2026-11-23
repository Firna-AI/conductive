// Finds the paths in the text of a file and rewrites them for the move.
import path from 'node:path'
import type { Tree } from './tree.ts'

/** The files whose text the move reads, by their ending. */
export const TEXT_FILE =
  /\.(tsx?|mts|cts|jsx?|mjs|cjs|css|md|astro|jsonc?|ya?ml|rs|html|toml|sh)$/

const CODE_FILE = /\.(tsx?|mts|cts|jsx?|mjs|cjs|astro|rs)$/

/** A quoted relative path in code, such as `'../ui/Menu.tsx'`. */
const QUOTED = /(['"`])(\.{1,2}\/[^'"`\s$]*)\1/g

/** A path in a CSS `url()` without quotes. */
const CSS_URL = /url\(\s*(\.{1,2}\/[^'")\s]+)\s*\)/g

/** The destination of a Markdown link or a link reference. */
const MARKDOWN_LINK =
  /(\]\(\s*<?)([^)\s>]+)|^(\[[^\]\n]+\]:\s*<?)(\S+?)(?=>?(\s|$))/gm

/** A path from the repository root, such as `docs/mockups/src/brand.ts`. */
const ROOT_PATH = /(?<![\w.@/-])\/?(docs\/mockups\/src\/[\w.@/-]*[\w])\/?/g

/** The relative paths in code and CSS, as the module graph sees them. */
export function relativePaths(file: string, text: string): string[] {
  const found: string[] = []
  if (CODE_FILE.test(file) || file.endsWith('.css'))
    for (const match of text.matchAll(QUOTED)) found.push(match[2])
  if (file.endsWith('.css'))
    for (const match of text.matchAll(CSS_URL)) found.push(match[1])
  return found
}

export type Scan = {
  text: string
  /** The specifiers that point into the moved paths, before the move. */
  targets: string[]
  /** The root paths that no rule can rewrite, for a person to check. */
  unsure: string[]
}

/**
 * Rewrites each path in `text`, the content of `file`. A path changes when
 * it names a moved file or folder, or when `file` itself moves.
 */
export function rewriteText(tree: Tree, file: string, text: string): Scan {
  const targets: string[] = []
  const unsure: string[] = []
  const relative = (value: string): string => {
    const next = tree.rewrite(file, value)
    if (next !== undefined) targets.push(value)
    return next ?? value
  }
  let next = text
  if (CODE_FILE.test(file) || file.endsWith('.css')) {
    next = next.replace(
      QUOTED,
      (_, quote: string, value: string) => `${quote}${relative(value)}${quote}`,
    )
  }
  if (file.endsWith('.css')) {
    next = next.replace(CSS_URL, (all, value: string) =>
      all.replace(value, relative(value)),
    )
  }
  if (file.endsWith('.md')) {
    next = next.replace(
      MARKDOWN_LINK,
      (all, open?: string, value?: string, refOpen?: string, ref?: string) => {
        const link = value ?? ref ?? ''
        if (!/^\.{0,2}\/?[\w.@-]/.test(link) || /^[a-z]+:/i.test(link))
          return all
        if (link.startsWith('/') || link.startsWith('#')) return all
        const fixed = link.startsWith('.') ? link : `./${link}`
        const changed = tree.rewrite(file, fixed)
        if (changed === undefined) return all
        const written = link.startsWith('.')
          ? changed
          : changed.replace(/^\.\//, '')
        return `${open ?? refOpen}${written}`
      },
    )
  }
  next = next.replace(ROOT_PATH, (all, value: string) => {
    const moved = rootPath(tree, value)
    if (moved !== undefined) return all.replace(value, moved)
    if (touchesMove(tree, value)) unsure.push(value)
    return all
  })
  return { text: next, targets, unsure }
}

function rootPath(tree: Tree, value: string): string | undefined {
  const target = tree.resolve('.', `./${value}`)
  if (!target || !tree.moves(target.path)) return undefined
  const to = tree.newPath(target.path)
  if (target.jsEnding) return to.replace(/\.tsx?$/, '.js')
  return to.slice(0, to.length - target.suffix.length)
}

/** A path inside a folder that keeps some files and moves others. */
function touchesMove(tree: Tree, value: string): boolean {
  const folder = value.replace(/\/$/, '')
  return Object.keys(tree.map).some(
    (file) =>
      file.startsWith(`${folder}/`) ||
      path.posix.dirname(file) === path.posix.dirname(folder),
  )
}
