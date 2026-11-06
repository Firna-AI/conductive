import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

// Root temporarily copies this one-time helper into desktop/scripts/.
if (process.platform !== 'darwin') throw new Error('This proof requires macOS.')
const desktop = resolve(import.meta.dirname, '..')
const repository = resolve(desktop, '..')
const evidence = resolve(repository, '.context/boat-native-remote-workspaces')
const prefix = resolve(evidence, 'desktop-window-space-proof')
const geometryPath = resolve(
  evidence,
  `desktop-window-space-${process.arch}-source.json`,
)
const reportPath = resolve(evidence, 'desktop-playwright.json')
const environment = { ...process.env }
delete environment.CONDUCTING_PACKAGED_APP
const steps: unknown[] = []
const runs: unknown[] = []
let outcome = 'running'
let failure: string | null = null
await mkdir(evidence, { recursive: true })

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value))
    throw new Error('The proof did not receive a JSON object.')
  return value
}

async function jsonOrNull(path: string): Promise<unknown> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'))
    return value
  } catch {
    return null
  }
}

async function summary() {
  await writeFile(
    `${prefix}.json`,
    JSON.stringify(
      {
        platform: process.platform,
        arch: process.arch,
        outcome,
        failure,
        steps,
        runs,
      },
      null,
      2,
    ) + '\n',
  )
}

async function command(label: string, script: string, args: string[] = []) {
  const commandArgs = [resolve(desktop, script), ...args]
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repository,
    env: environment,
    encoding: 'utf8',
  })
  const output = result.stdout + result.stderr
  const item = {
    label,
    command: [process.execPath, ...commandArgs],
    exit: result.status,
    error: result.error?.message ?? null,
    output,
  }
  steps.push(item)
  await writeFile(
    `${prefix}-${label}.json`,
    JSON.stringify(item, null, 2) + '\n',
  )
  await writeFile(`${prefix}-${label}.log`, output)
  await summary()
  return item
}

async function build(label: string) {
  const result = await command(label, 'scripts/build.ts')
  if (result.exit !== 0) throw new Error(`The ${label} desktop build failed.`)
}

async function spec(label: string) {
  await rm(reportPath, { force: true })
  await rm(geometryPath, { force: true })
  const result = await command(label, 'scripts/smoke.ts', [
    'tests/window-space.spec.ts',
  ])
  const report = await jsonOrNull(reportPath)
  const geometry = await jsonOrNull(geometryPath)
  const stats = report === null ? {} : record(record(report).stats)
  const item = {
    label,
    exit: result.exit,
    passed: stats.expected ?? 0,
    failed: stats.unexpected ?? 0,
    skipped: stats.skipped ?? 0,
    durationMs: stats.duration ?? null,
    output: result.output,
    report,
    geometry,
  }
  runs.push(item)
  await writeFile(
    `${prefix}-${label}-result.json`,
    JSON.stringify(item, null, 2) + '\n',
  )
  await summary()
  return item
}

function passed(run: Awaited<ReturnType<typeof spec>>) {
  return (
    run.exit === 0 && run.passed === 1 && run.failed === 0 && run.skipped === 0
  )
}

function fullScreenWidth64(geometry: unknown) {
  if (geometry === null) return false
  const stages = record(geometry).stages
  if (!Array.isArray(stages)) return false
  return stages.some((value: unknown) => {
    const stage = record(value)
    return (
      stage.stage === 'full-screen' &&
      stage.isFullScreen === true &&
      Array.isArray(stage.widths) &&
      stage.widths.at(-1) === 64
    )
  })
}

function requireCleanPass(run: Awaited<ReturnType<typeof spec>>) {
  if (passed(run)) return
  if (fullScreenWidth64(run.geometry)) {
    outcome = 'product-defect-64px-in-full-screen'
    throw new Error(
      'Native full screen retained 64px. Stop. No product fix is authorized.',
    )
  }
  outcome = `${run.label}-failed`
  throw new Error(
    `The unmodified ${run.label} spec failed. Stop before any further run.`,
  )
}

async function mutation(label: string, path: string, from: string, to: string) {
  const original = await readFile(path, 'utf8')
  if (original.split(from).length !== 2)
    throw new Error(`The ${label} mutation target must occur once.`)
  try {
    await writeFile(path, original.replace(from, to))
    await build(`${label}-build`)
    const run = await spec(label)
    const output = stripVTControlCharacters(run.output)
    if (
      run.exit === 0 ||
      run.failed !== 1 ||
      run.skipped !== 0 ||
      !/Expected:\s+(0|64)/.test(output) ||
      !/Received:\s+(0|64)/.test(output)
    )
      throw new Error(
        `The ${label} mutation did not produce the required layout assertion failure.`,
      )
  } finally {
    await writeFile(path, original)
    await build(`${label}-restore-build`)
  }
  const restored = (await readFile(path, 'utf8')) === original
  if (!restored) throw new Error(`The ${label} source was not restored.`)
}

try {
  // The existing CI build is unmodified. A failed baseline runs no mutation or rebuild.
  requireCleanPass(await spec('baseline'))
  await mutation(
    'overlay-off',
    resolve(desktop, 'src/window.ts'),
    "titleBarOverlay:\n      process.platform === 'darwin' ? { height: BAR_HEIGHT } : false,",
    'titleBarOverlay: false,',
  )
  await mutation(
    'listener-removed',
    resolve(desktop, 'renderer/chrome.ts'),
    "  overlay.addEventListener('geometrychange', update)\n",
    '',
  )
  for (let index = 1; index <= 10; index += 1) {
    requireCleanPass(await spec(`clean-${String(index).padStart(2, '0')}`))
  }
  outcome = 'passed'
} catch (error) {
  failure =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(failure + '\n')
  process.exitCode = 1
} finally {
  await summary()
  await copyFile(`${prefix}.json`, `${prefix}-${process.arch}.json`)
}
