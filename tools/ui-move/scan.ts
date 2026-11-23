// Finds the paths in the text of a file and rewrites them for the move.
import {
  asRelative,
  codeImports,
  cssReferences,
  CSS_REFERENCE,
  isLocal,
} from './refs.ts'
import type { Tree } from './tree.ts'

/** The files whose text the move reads, by their ending. */
export const TEXT_FILE =
  /\.(tsx?|mts|cts|jsx?|mjs|cjs|css|md|astro|jsonc?|ya?ml|rs|html|toml|sh)$/

const CODE_FILE = /\.(tsx?|mts|cts|jsx?|mjs|cjs|astro|rs)$/

/** A quoted relative path in code, such as `'../ui/Menu.tsx'`. */
const QUOTED = /(['"`])(\.{1,2}\/[^'"`\s$]*)\1/g

/** A CSS reference, or a quoted relative path, such as one in a comment. */
const CSS_PATH = new RegExp(
  `${CSS_REFERENCE.source}|(['"])(\\.{1,2}\\/[^'"\\s]*)\\7`,
  'g',
)

/** The destination of a Markdown link or a link reference. */
const MARKDOWN_LINK =
  /(\]\(\s*<?)([^)\s>]+)|^(\[[^\]\n]+\]:\s*<?)(\S+?)(?=>?(\s|$))/gm

/** A path from the repository root, such as `docs/mockups/src/brand.ts`. */
const ROOT_PATH = /(?<![\w.@/-])\/?(docs\/mockups\/src\/[\w.@/-]*[\w])\/?/g

/** The relative paths that a file loads, as the module graph sees them. */
export function relativePaths(file: string, text: string): string[] {
  if (file.endsWith('.css')) return cssReferences(text)
  return codeImports(file, text).filter((value) => value.startsWith('.'))
}

export type Scan = {
  text: string
  /** The root paths that no rule can rewrite, for a person to check. */
  unsure: string[]
}

/**
 * Rewrites each path in `text`, the content of `file`. A path changes when
 * it names a moved file or folder, or when `file` itself moves.
 */
export function rewriteText(tree: Tree, file: string, text: string): Scan {
  const unsure: string[] = []
  let next = text
  if (CODE_FILE.test(file)) {
    // Also a path in a comment or a string, so that it stays true.
    next = next.replace(
      QUOTED,
      (_, quote: string, value: string) =>
        `${quote}${tree.rewrite(file, value) ?? value}${quote}`,
    )
  }
  if (file.endsWith('.css')) {
    next = next.replace(CSS_PATH, (all: string, ...groups: string[]) => {
      const value = groups[1] ?? groups[3] ?? groups[5] ?? groups[7]
      return all.replace(value, cssPath(tree, file, value))
    })
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
    if (namesNothing(tree, value)) unsure.push(value)
    return all
  })
  return { text: next, unsure }
}

/** The new form of a CSS path. A bare path such as `badge.svg` stays bare. */
function cssPath(tree: Tree, file: string, value: string): string {
  if (!isLocal(value)) return value
  const next = tree.rewrite(file, asRelative(value))
  if (next === undefined) return value
  return !value.startsWith('.') && next.startsWith('./') ? next.slice(2) : next
}

function rootPath(tree: Tree, value: string): string | undefined {
  const target = tree.resolve('.', `./${value}`)
  if (!target || !tree.moves(target.path)) return undefined
  const to = tree.newPath(target.path)
  if (target.jsEnding) return to.replace(/\.tsx?$/, '.js')
  return to.slice(0, to.length - target.suffix.length)
}

/** A root path that no rule rewrites and that names no file or folder. */
function namesNothing(tree: Tree, value: string): boolean {
  return tree.resolve('.', `./${value}`) === undefined
}
