import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { onTestFinished } from 'vitest'

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function execute(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ code: string | number; stdout: string; stderr: string }>(
    (resolve) => {
      execFile(command, args, { env }, (error, stdout, stderr) => {
        resolve({ code: error?.code ?? 0, stdout, stderr })
      })
    },
  )
}

export async function runtimeNodeFixture() {
  const root = await mkdtemp(join(tmpdir(), 'conductive runtime-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const source = join(root, 'runner')
  const prefix = join(root, 'installed runner')
  const runtime = join(root, 'private runtime', 'bin')
  const commands = join(root, 'commands')
  const calls = join(root, 'calls.txt')
  const unit = join(root, 'conductive-runner.service')
  const secrets = join(root, 'sandbox-env.sh')
  const node = join(runtime, 'node')
  const npm = join(runtime, 'npm')
  const installer = join(source, 'scripts', 'install.sh')
  for (const directory of [
    join(source, 'scripts'),
    join(source, 'service'),
    join(root, 'dist', 'runner'),
    join(root, 'dist', 'sdk-helper'),
    join(source, 'sdk-helper'),
    runtime,
    commands,
  ]) {
    await mkdir(directory, { recursive: true })
  }
  const executable = (path: string, content: string) =>
    writeFile(path, content, { mode: 0o755 })
  const record = (label: string) =>
    `printf '%s\\n' ${shellQuote(label)} >> ${shellQuote(calls)}`
  await writeFile(calls, '')
  await executable(
    node,
    `#!/bin/sh\n${record('private Node')}\nexec ${shellQuote(process.execPath)} "$@"\n`,
  )
  await executable(
    npm,
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs'
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + '\\n')
`,
  )
  for (const command of ['node', 'npm']) {
    await executable(
      join(commands, command),
      `#!/bin/sh\n${record(`PATH ${command}`)}\nexit 82\n`,
    )
  }
  await executable(join(commands, 'getent'), '#!/bin/sh\nexit 0\n')
  await executable(
    join(commands, 'systemctl'),
    `#!/bin/sh\nprintf 'systemctl %s\\n' "$*" >> ${shellQuote(calls)}\n`,
  )
  const adapted = async (
    name: string,
    resource: string,
    replacement: string,
  ) => {
    const content = await readFile(
      new URL(`../${name}`, import.meta.url),
      'utf8',
    )
    if (!content.includes(resource)) {
      throw new Error(`Update the fake resource path for ${name}.`)
    }
    await writeFile(
      join(source, name),
      content.replaceAll(resource, shellQuote(replacement)),
    )
  }
  await adapted(
    'scripts/install.sh',
    '/etc/systemd/system/conductive-runner.service',
    unit,
  )
  await adapted('service/start.sh', '/run/ascii-secrets/env.sh', secrets)
  await copyFile(
    new URL('../service/conductive-runner.service', import.meta.url),
    join(source, 'service', 'conductive-runner.service'),
  )
  await writeFile(join(source, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(source, 'package-lock.json'), '{}\n')
  await writeFile(
    join(source, 'sdk-helper', 'package.json'),
    '{"type":"module"}\n',
  )
  await writeFile(join(source, 'sdk-helper', 'package-lock.json'), '{}\n')
  await writeFile(join(root, 'dist', 'sdk-helper', 'sdk-helper.mjs'), '')
  const program = `process.stdout.write(JSON.stringify({
  node: process.execPath,
  marker: process.env.RUNTIME_TEST_MARKER,
  envNode: process.env.CONDUCTIVE_NODE,
  path: process.env.PATH,
  helper: process.env.CONDUCTIVE_SDK_HELPER,
}))\n`
  for (const name of ['runner.mjs', 'measure.mjs', 'compare.mjs']) {
    await writeFile(join(root, 'dist', 'runner', name), program)
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${commands}:${process.env.PATH}`,
    CONDUCTIVE_NODE: node,
    TZ: 'UTC',
    LC_ALL: 'C',
  }
  return {
    node,
    npm,
    prefix,
    commands,
    install: (setting: string | undefined) => {
      const configured = { ...env }
      if (setting === undefined) delete configured.CONDUCTIVE_NODE
      else configured.CONDUCTIVE_NODE = setting
      return execute('/bin/sh', [installer, 'agent', prefix], configured)
    },
    calls: async () =>
      (await readFile(calls, 'utf8')).split('\n').filter(Boolean),
    unit: () => readFile(unit, 'utf8'),
    start: async (invocation: string) => {
      await writeFile(
        secrets,
        `CONDUCTIVE_NODE=${shellQuote(join(commands, 'node'))}
PATH=${shellQuote(`${commands}:/usr/bin:/bin`)}
RUNTIME_TEST_MARKER=loaded
`,
      )
      return execute('/bin/sh', ['-c', invocation], env)
    },
  }
}
