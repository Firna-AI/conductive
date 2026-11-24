import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import { metrics } from '../../src/ui/design/metrics.ts'
import { findClassJoins, type ClassScan } from './class-joins.ts'
import { convertCss } from './convert-css.ts'
import { renderDraft } from './draft.ts'
import { renderReport, type ModuleReport } from './report.ts'

const usage = 'Usage: npm run styles:convert -- <area folder> --out <folder>'
const tokenValues = new Map<string, string>(
  Object.entries(metrics).map(([name, value]) => [
    `--ui-${name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}`,
    value,
  ]),
)

function relative(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/') || '.'
}

function* sourceFiles(folder: string): IterableIterator<string> {
  const entries = readdirSync(folder, { withFileTypes: true })
  entries.sort((left, right) =>
    left.name < right.name ? -1 : Number(left.name !== right.name),
  )
  for (const entry of entries) {
    const file = path.join(folder, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(file)
    else if (entry.isFile()) yield file
  }
}

function ensureEmpty(folder: string) {
  const stat = statSync(folder, { throwIfNoEntry: false })
  if (!stat) return
  if (!stat.isDirectory())
    throw new Error(`Output path ${relative(folder)} points to a file.`)
  if (readdirSync(folder).length !== 0)
    throw new Error(`Output folder ${relative(folder)} must be empty.`)
}

function makeFolder(folder: string, created: string[]) {
  if (statSync(folder, { throwIfNoEntry: false })?.isDirectory()) return
  makeFolder(path.dirname(folder), created)
  mkdirSync(folder)
  created.push(folder)
}

function writeOutput(folder: string, outputs: [string, string][]) {
  ensureEmpty(folder)
  const files: string[] = []
  const folders: string[] = []
  try {
    for (const [file, text] of outputs) {
      makeFolder(path.dirname(file), folders)
      // Create the report first so that two runs cannot write to the same folder.
      const handle = openSync(file, 'wx')
      files.push(file)
      try {
        writeFileSync(handle, text)
      } finally {
        closeSync(handle)
      }
    }
  } catch (error) {
    for (const file of files.reverse()) unlinkSync(file)
    for (const folder of folders.reverse()) rmdirSync(folder)
    throw error
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    options: { out: { type: 'string' }, help: { type: 'boolean' } },
    allowPositionals: true,
  })
  if (values.help) {
    process.stdout.write(usage + '\n')
    return
  }
  if (positionals.length !== 1 || !positionals[0])
    throw new Error('Give one area folder.')
  if (!values.out) throw new Error('Give an output folder with --out.')
  const area = path.resolve(positionals[0])
  const out = path.resolve(values.out)
  if (!statSync(area, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Area folder ${relative(area)} does not exist.`)
  }
  ensureEmpty(out)
  const drafts: [string, string][] = []
  const modules: ModuleReport[] = []
  const scan: ClassScan = { joins: [], checks: [], unscanned: [] }
  for (const file of sourceFiles(area)) {
    const name = relative(file)
    if (file.endsWith('.module.css')) {
      const conversion = convertCss(
        name,
        readFileSync(file, 'utf8'),
        tokenValues,
      )
      modules.push(conversion)
      if (conversion.classes) {
        const draft = path
          .relative(area, file)
          .replace(/\.module\.css$/, '.styles.ts')
        drafts.push([
          path.join(out, draft),
          await renderDraft(name, conversion.classes),
        ])
      }
    } else if (
      path.extname(file).toLowerCase() !== '.css' &&
      !/\.(test|spec)\./.test(path.basename(file))
    ) {
      const found = findClassJoins(name, readFileSync(file, 'utf8'))
      scan.joins.push(...found.joins)
      scan.checks.push(...found.checks)
      scan.unscanned.push(...found.unscanned)
    }
  }
  const report = path.join(out, 'report.md')
  const { text, summary } = renderReport(relative(area), modules, scan)
  writeOutput(out, [[report, text], ...drafts])
  process.stdout.write(`${summary.join('\n')}\nReport ${relative(report)}\n`)
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(message + '\n')
  process.exitCode = 1
}
