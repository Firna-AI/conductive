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

function runPlan() {
  const result = plan(tracked())
  if (result.blocked.length > 0) {
    console.error('The moved modules reach mockup-only modules:')
    for (const chain of result.blocked) console.error(`  ${chain.join(' -> ')}`)
    process.exitCode = 1
    return
  }
  const sorted = Object.fromEntries(Object.entries(result.map).sort())
  writeFileSync(MAP_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
  console.log(`Wrote ${Object.keys(sorted).length} paths to ${MAP_FILE}.`)
}

function runApply() {
  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8')) as PathMap
  let moved = 0
  for (const [from, to] of Object.entries(map)) {
    if (!existsSync(from) || existsSync(to)) continue
    mkdirSync(path.dirname(to), { recursive: true })
    execFileSync('git', ['mv', from, to])
    moved += 1
  }
  const files = tracked()
  const tree = new Tree(files, map)
  const unsure = new Map<string, Set<string>>()
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
  console.log(`Moved ${moved} files. Rewrote ${changed} files.`)
  if (unsure.size > 0) {
    console.log('Check these paths by hand. Their folders keep some files:')
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
