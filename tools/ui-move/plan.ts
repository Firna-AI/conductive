// Builds the path map: each mockup module that shipped code imports, and
// each module that those modules import in turn.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { codeImports } from './refs.ts'
import { relativePaths, TEXT_FILE } from './scan.ts'
import { Tree, type PathMap } from './tree.ts'

const MOCKUPS = 'docs/mockups/src/'

/** The folders of shipped code, whose imports decide what moves. */
const SHIPPED = /^(src|worker|desktop)\//

/** Development code and tests, which can keep their mockup imports. */
const EXEMPT =
  /(^|\/)(dev|tests?|test-support)\/|\.(test|spec|test-support)\.[cm]?[jt]sx?$/

/** Mockup modules that must never move, because the app cannot run them. */
const MOCKUP_ONLY =
  /^docs\/mockups\/src\/(fixtures|entries)\/|\/(ScreenLink\.tsx|render\.tsx|(banner|branch|service)?[pP]aths\.ts)$/

/** A licence file, such as the OFL text beside a font. */
const LICENCE = /\/[^/]*(LICEN[CS]E|OFL)[^/]*$/i

export type Plan = {
  map: PathMap
  /** Each mockup-only module that the moved set reaches, with its chain. */
  blocked: string[][]
}

/** The new path of a moved mockup module. */
function destination(file: string): string {
  if (file === `${MOCKUPS}brand.ts`) return 'src/shared/brand.ts'
  return `src/ui/${file.slice(MOCKUPS.length)}`
}

export function plan(files: string[]): Plan {
  const tree = new Tree(files, {})
  const parent = new Map<string, string | undefined>()
  const queue: string[] = []
  const add = (file: string, from?: string) => {
    if (!file.startsWith(MOCKUPS) || parent.has(file)) return
    if (!tree.files.has(file)) return
    parent.set(file, from)
    queue.push(file)
  }
  for (const file of files) {
    if (!SHIPPED.test(file) || EXEMPT.test(file) || !TEXT_FILE.test(file))
      continue
    for (const target of imports(tree, file)) add(target, file)
  }
  for (let at = 0; at < queue.length; at += 1) {
    const file = queue[at]
    if (mockupOnly(file)) continue
    for (const target of imports(tree, file)) add(target, file)
  }
  // A licence file has no importer, so it moves with the files beside it.
  for (const file of [...queue]) {
    const folder = path.posix.dirname(file)
    for (const other of files) {
      if (path.posix.dirname(other) === folder && LICENCE.test(other))
        add(other, file)
    }
  }
  const blocked: string[][] = []
  const map: PathMap = {}
  for (const file of queue) {
    if (mockupOnly(file)) blocked.push(chain(parent, file))
    else map[file] = destination(file)
  }
  return { map, blocked }
}

/** A module that the app cannot run: its path, or an import of Mokly. */
function mockupOnly(file: string): boolean {
  if (MOCKUP_ONLY.test(file)) return true
  return codeImports(file, readFileSync(file, 'utf8')).some(
    (value) => value === '@mokly/mokly' || value.startsWith('@mokly/mokly/'),
  )
}

/** The files that the relative paths of `file` name. */
function imports(tree: Tree, file: string): string[] {
  const folder = path.posix.dirname(file)
  return relativePaths(file, readFileSync(file, 'utf8')).flatMap((value) => {
    const target = tree.resolve(folder, value.split(/[?#]/)[0])
    return target ? [target.path] : []
  })
}

function chain(parent: Map<string, string | undefined>, file: string) {
  const result = [file]
  let at = parent.get(file)
  while (at !== undefined) {
    result.unshift(at)
    at = parent.get(at)
  }
  return result
}
