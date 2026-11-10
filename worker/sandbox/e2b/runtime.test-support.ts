import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, URL as NodeURL } from 'node:url'
import { promisify } from 'node:util'

import { onTestFinished } from 'vitest'

export const execute = promisify(execFile)

export async function runtimeDirectory(): Promise<string> {
  const directory = await mkdtemp(
    join(process.cwd(), '.context/e2b-backup-provider/runtime-'),
  )
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

export async function pythonRuntime(
  module: 'command-supervisor.py' | 'environment.py',
  driver: string,
): Promise<unknown> {
  const directory = await runtimeDirectory()
  const path = fileURLToPath(new NodeURL(module, import.meta.url))
  const source = `import importlib.util, sys, os, json, pwd, io, contextlib\nspec = importlib.util.spec_from_file_location("runtime", sys.argv[1])\nruntime = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(runtime)\ndirectory = sys.argv[2]\n${driver}`
  const result = await execute(
    'python3',
    ['-B', '-c', source, path, directory],
    { encoding: 'utf8' },
  )
  return JSON.parse(result.stdout)
}
