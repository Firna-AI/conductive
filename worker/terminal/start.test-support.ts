import { chmod, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'

import { installationFixture } from './install.test-support'
import { RESTART_COMMAND } from '../lifecycle/software-restart'
import { shellArgument } from './privileged'
import {
  TERMINAL_ATTACH_PROGRAM,
  TERMINAL_RUNTIME,
  TERMINAL_RUNTIME_VIEW,
  TERMINAL_SUPPORT_FILE,
} from './scripts'
import { runScript } from './scripts.test-support'
import { terminalStartCommand } from './service'

export async function terminalStartFixture() {
  const fixture = await installationFixture()
  const attach = `${fixture.root}/attach`
  const proc = `${fixture.root}/proc`
  const schedule = `${fixture.root}/pids`
  const reads = `${fixture.root}/pid-reads`
  const sleeps = `${fixture.root}/sleeps`
  const commands = `${fixture.root}/commands`
  const failure = `${fixture.root}/failure`
  await writeFile(attach, '#!/bin/sh\nexit 0\n')
  await chmod(attach, 0o700)
  const programs = {
    mountpoint: '#!/bin/sh\nexit 0\n',
    mount: '#!/bin/sh\nexit 0\n',
    sleep: `#!/bin/sh
printf '%s\\n' "$*" >> ${shellArgument(sleeps)}
`,
    flock: `#!/bin/sh
printf 'flock %s\\n' "$*" >> ${shellArgument(commands)}
shift
exec "$@"
`,
    systemctl: `#!/bin/sh
printf '%s\\n' "$*" >> ${shellArgument(commands)}
[ "$*" != "$(cat ${shellArgument(failure)})" ] || exit 1
[ "$1" = show ] || exit 0
count=$(wc -l < ${shellArgument(reads)})
pid=$(sed -n "$((count + 1))p" ${shellArgument(schedule)})
[ -n "$pid" ] || pid=$(tail -n 1 ${shellArgument(schedule)})
printf '%s\\n' "$pid" >> ${shellArgument(reads)}
printf '%s\\n' "$pid"
`,
  }
  for (const [name, program] of Object.entries(programs)) {
    await writeFile(`${fixture.root}/bin/${name}`, program)
    await chmod(`${fixture.root}/bin/${name}`, 0o700)
  }
  const mapped = (command: string) =>
    command
      .replaceAll(TERMINAL_RUNTIME_VIEW, `${fixture.root}/runtime-view`)
      .replaceAll(TERMINAL_RUNTIME, fixture.options.runtimeDirectory)
      .replaceAll(TERMINAL_ATTACH_PROGRAM, attach)
      .replaceAll('/proc/', `${proc}/`)
  const lines = async (path: string) =>
    (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean)
  const run = async (command: string, pids: readonly number[], fail = '') => {
    await writeFile(schedule, `${pids.join('\n')}\n`)
    await writeFile(reads, '')
    await writeFile(sleeps, '')
    await writeFile(commands, '')
    await writeFile(failure, fail)
    return runScript(mapped(command), false, {
      ...process.env,
      PATH: `${fixture.root}/bin:${process.env.PATH}`,
    })
  }
  return {
    attach,
    async process(pid: number, executable: string, args: readonly string[]) {
      await mkdir(`${proc}/${pid}`, { recursive: true })
      await symlink(executable, `${proc}/${pid}/exe`)
      await writeFile(`${proc}/${pid}/cmdline`, `${args.join('\0')}\0`)
      return { argumentsFile: `${proc}/${pid}/cmdline` }
    },
    async start(pids: readonly number[], fail?: string) {
      return run(terminalStartCommand(), pids, fail)
    },
    restart: (pids: readonly number[], fail?: string) =>
      run(RESTART_COMMAND, pids, fail),
    marker: () =>
      readFile(
        `${fixture.options.runtimeDirectory}/${TERMINAL_SUPPORT_FILE}`,
        'utf8',
      ).catch((error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return undefined
        throw error
      }),
    reads: () => lines(reads),
    sleeps: () => lines(sleeps),
    commands: () => lines(commands),
  }
}
