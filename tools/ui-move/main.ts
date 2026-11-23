// Moves the shared UI from docs/mockups/src/ into src/ui/, and rewrites the
// paths that name it. Run: node tools/ui-move/main.ts <plan|apply>
// The README beside this file gives the steps for an open branch.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { plan } from './plan.ts'
import { rewriteText, TEXT_FILE } from './scan.ts'
import { Tree, type PathMap } from './tree.ts'

const MAP_FILE = 'tools/ui-move/map.json'

/** Files whose old paths are history or the record of this move. */
const KEEP =
  /^(plans\/[^/]+\.md|tools\/ui-move\/.*|CHANGELOG\.md|package-lock\.json)$/

function tracked(): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  return out.split('\0').filter((file) => file && existsSync(file))
}

function readMap(): PathMap {
  return existsSync(MAP_FILE)
    ? (JSON.parse(readFileSync(MAP_FILE, 'utf8')) as PathMap)
    : {}
}

/**
 * Adds the paths of a new plan to the map, and writes it. The map is the
 * record of every move, so a later plan only adds to it. It returns the
 * merged map, or nothing when the plan reaches mockup-only modules.
 */
function extendMap(known: PathMap): PathMap | undefined {
  const result = plan(tracked())
  if (result.blocked.length > 0) {
    console.error('The moved modules reach mockup-only modules:')
    for (const chain of result.blocked) console.error(`  ${chain.join(' -> ')}`)
    console.error('Fix these imports by hand, then run the command again.')
    process.exitCode = 1
    return undefined
  }
  const merged = { ...known, ...result.map }
  const sorted = Object.fromEntries(Object.entries(merged).sort())
  writeFileSync(MAP_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
  const added = Object.keys(merged).length - Object.keys(known).length
  console.log(
    `Added ${added} paths. ${MAP_FILE} holds ${Object.keys(sorted).length}.`,
  )
  return sorted
}

/** Moves each file of the map that is still at its old path. */
function moveFiles(map: PathMap): number {
  let moved = 0
  for (const [from, to] of Object.entries(map)) {
    if (!existsSync(from) || existsSync(to)) continue
    mkdirSync(path.dirname(to), { recursive: true })
    execFileSync('git', ['mv', from, to])
    moved += 1
  }
  return moved
}

/** Rewrites the paths of each text file, and collects the stale ones. */
function rewriteFiles(map: PathMap, unsure: Map<string, Set<string>>) {
  const files = tracked()
  const tree = new Tree(files, map)
  let changed = 0
  for (const file of files) {
    if (!TEXT_FILE.test(file) || KEEP.test(file)) continue
    const text = readFileSync(file, 'utf8')
    const result = rewriteText(tree, file, text)
    if (result.text !== text) {
      writeFileSync(file, result.text)
      changed += 1
    }
    for (const value of result.unsure) {
      const seen = unsure.get(value) ?? new Set()
      seen.add(file)
      unsure.set(value, seen)
    }
  }
  return changed
}

function runPlan() {
  extendMap(readMap())
}

/**
 * Applies the map, then plans again: a branch can add an import of a
 * mockup module that the map does not know. The second pass moves those
 * modules too, and adds them to the map.
 */
function runApply() {
  let map = readMap()
  const unsure = new Map<string, Set<string>>()
  let moved = moveFiles(map)
  let changed = rewriteFiles(map, unsure)
  const known = Object.keys(map).length
  const next = extendMap(map)
  if (next && Object.keys(next).length > known) {
    map = next
    moved += moveFiles(map)
    changed += rewriteFiles(map, unsure)
  }
  console.log(`Moved ${moved} files. Rewrote ${changed} files.`)
  if (unsure.size > 0) {
    console.log('Check these paths by hand. They name no file or folder:')
    for (const [value, where] of [...unsure].sort())
      console.log(`  ${value}: ${[...where].sort().join(', ')}`)
  }
}

const command = process.argv[2]
if (command === 'plan') runPlan()
else if (command === 'apply') runApply()
else {
  console.error('Usage: node tools/ui-move/main.ts <plan|apply>')
  process.exitCode = 2
}
