import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { parentPort } from 'node:worker_threads'
import { missing, readSourceFile } from './safe-files.ts'
import type { ImportLocations } from './locations.ts'

const settings = [
  '--no-pager',
  '--no-optional-locks',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.untrackedCache=false',
  '-c',
  'diff.external=',
  '-c',
  'core.attributesFile=/dev/null',
]
const environment = () => ({
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_NO_LAZY_FETCH: '1',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '/usr/bin/false',
  SSH_ASKPASS: '/usr/bin/false',
  GIT_NO_REPLACE_OBJECTS: '1',
  GIT_ATTR_NOSYSTEM: '1',
})

export interface GitInput {
  input?: string
  inputFile?: string
  output?: string
  allowFailure?: boolean
}

/** argv never enters a shell, and Git never receives an ambient credential. */
export function git(
  cwd: string,
  args: string[],
  signal: AbortSignal,
  input: GitInput = {},
): Promise<string> {
  return runGit(cwd, args, signal, input, environment())
}

async function runGit(
  cwd: string,
  args: string[],
  signal: AbortSignal,
  input: GitInput,
  processEnvironment: NodeJS.ProcessEnv,
): Promise<string> {
  signal.throwIfAborted()
  const child = spawn('git', [...settings, '-C', cwd, ...args], {
    env: processEnvironment,
    stdio: ['pipe', 'pipe', 'pipe'],
    signal,
    detached: true,
  })
  if (child.pid)
    parentPort?.postMessage({ kind: 'process', pid: child.pid, active: true })
  child.once('close', () => {
    if (child.pid)
      parentPort?.postMessage({
        kind: 'process',
        pid: child.pid,
        active: false,
      })
  })
  let processError: Error | undefined
  const result = new Promise<number | null>((resolve) => {
    child.once('error', (error: Error) => {
      processError = error
    })
    child.once('close', resolve)
  })
  let stdout = ''
  child.stderr.resume()
  const copying = input.output
    ? pipeline(
        child.stdout,
        createWriteStream(input.output, { flags: 'wx', mode: 0o600 }),
        { signal },
      )
    : undefined
  if (!copying)
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk
    })
  child.stdin.on('error', () => undefined)
  const feeding = input.inputFile
    ? pipeline(createReadStream(input.inputFile), child.stdin, { signal })
    : undefined
  if (!feeding) child.stdin.end(input.input)
  const [finished, copied, fed] = await Promise.allSettled([
    result,
    copying,
    feeding,
  ])
  signal.throwIfAborted()
  if (processError) throw processError
  if (finished.status === 'rejected') throw finished.reason
  if (copied.status === 'rejected') throw copied.reason
  const code = finished.value
  if (fed.status === 'rejected') {
    const reason: unknown = fed.reason
    const closed =
      reason instanceof Error &&
      'code' in reason &&
      (reason.code === 'EPIPE' || reason.code === 'ERR_STREAM_PREMATURE_CLOSE')
    if (code !== 0 || !closed) throw reason
  }
  if (code !== 0 && !(code === 1 && input.allowFailure))
    throw new Error('Local Git data is unavailable.')
  return code === 0 ? stdout : ''
}

export async function sourceGit(cwd: string, signal: AbortSignal) {
  return (args: string[], input?: GitInput) => git(cwd, args, signal, input)
}

/** Only this data query reads user config. Acting commands keep fixed settings. */
export async function userExcludesFile(
  cwd: string,
  locations: ImportLocations,
  signal: AbortSignal,
): Promise<string> {
  const xdg = locations.xdgConfigHome ?? process.env.XDG_CONFIG_HOME
  const configEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^GIT_CONFIG_(?:COUNT|PARAMETERS|KEY_\d+|VALUE_\d+)$/.test(key),
    ),
  )
  const value = await runGit(
    cwd,
    ['config', '--null', '--path', '--get', 'core.excludesFile'],
    signal,
    { allowFailure: true },
    {
      ...environment(),
      ...configEnvironment,
      HOME: locations.home,
      XDG_CONFIG_HOME: xdg,
      GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
      GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM,
      GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM,
    },
  )
  return value === ''
    ? join(xdg || join(locations.home, '.config'), 'git/ignore')
    : value.slice(0, -1)
}

/** The source rules read an absent private index, never the staged gitlinks. */
export async function ignoredSourcePaths(
  cwd: string,
  paths: string[],
  excludesFile: string,
  indexFile: string,
  signal: AbortSignal,
): Promise<Set<string>> {
  if (!paths.length) return new Set()
  const output = await runGit(
    cwd,
    [
      '-c',
      `core.excludesFile=${excludesFile}`,
      'check-ignore',
      '--no-index',
      '--stdin',
      '-z',
    ],
    signal,
    { input: paths.join('\0') + '\0', allowFailure: true },
    { ...environment(), GIT_INDEX_FILE: indexFile },
  )
  return new Set(output.split('\0').filter(Boolean))
}

/** Worktree conversions use only our config, even if source config changes. */
export async function controlledWorktree(
  root: string,
  commonDirectory: string,
  index: string,
  head: string,
  format: 'sha1' | 'sha256',
  signal: AbortSignal,
  preserveStatCache = true,
) {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-import-git-'))
  try {
    await git(
      directory,
      ['init', '--bare', '--template=', `--object-format=${format}`, '.'],
      signal,
    )
    await mkdir(join(directory, 'objects/info'), { recursive: true })
    await writeFile(
      join(directory, 'objects/info/alternates'),
      `${JSON.stringify(join(commonDirectory, 'objects'))}\n`,
      { mode: 0o600 },
    )
    await mkdir(join(directory, 'info'), { recursive: true, mode: 0o700 })
    await writeFile(
      join(directory, 'info/attributes'),
      '* -text -filter -working-tree-encoding -ident -eol\n',
      { mode: 0o600 },
    )
    const run = (args: string[], input?: GitInput) =>
      git(
        directory,
        [`--git-dir=${directory}`, `--work-tree=${root}`, ...args],
        signal,
        input,
      )
    if (preserveStatCache) {
      try {
        await readSourceFile(index, signal, join(directory, 'index'))
      } catch (error) {
        if (!missing(error)) throw error
        await run(['read-tree', head])
      }
    } else await run(['read-tree', head])
    return {
      run,
      ignoreIndex: join(directory, 'walk-ignore-index'),
      dispose: () => rm(directory, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}
