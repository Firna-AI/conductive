import { execFile } from 'node:child_process'

import type { HttpFetch } from '../../env'
import { BoatClient } from '../../sandbox/boat'
import { readCommandStatus } from '../../sandbox/parsers'
import type {
  CommandOffsets,
  CommandResult,
  CommandStatus,
} from '../../sandbox/provider'
import { sourceRepositoryUrl } from './native-command'

export function nativeEnvironment(
  home: string,
  root: string,
): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: home,
    TMPDIR: root,
    LC_ALL: 'C',
    TZ: 'UTC',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CEILING_DIRECTORIES: root,
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'Source Reader',
    GIT_COMMITTER_NAME: 'Source Reader',
    GIT_AUTHOR_EMAIL: 'source@example.test',
    GIT_COMMITTER_EMAIL: 'source@example.test',
    GIT_AUTHOR_DATE: '2001-01-01T00:00:00Z',
    GIT_COMMITTER_DATE: '2001-01-01T00:00:00Z',
  }
}

export function nativeGit(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      '/usr/bin/git',
      args,
      { cwd, env, encoding: 'buffer' },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.toString() || error.message))
        else resolve(stdout)
      },
    )
    child.stdin?.end()
  })
}

/** Executes only mapped native commands in one test's temporary home. */
export class NativeSourceProvider extends BoatClient {
  private readonly home: string
  private readonly root: string
  private readonly localOrigin: string
  readonly commands: string[] = []
  readonly mappedCommands: string[] = []
  readonly statusIds: number[] = []
  readonly results: CommandResult[] = []
  readonly processes: {
    promise: Promise<CommandResult>
    result?: CommandResult
  }[] = []
  loseStartReply = false
  lostProcess = false
  reportedError: string | undefined
  beforeStart?: (command: string) => Promise<void>

  constructor(
    home: string,
    root: string,
    localOrigin: string,
    fetch: HttpFetch,
  ) {
    super('boat-first', fetch, { id: 'team-one', type: 'org' })
    this.home = home
    this.root = root
    this.localOrigin = localOrigin
  }

  override async startCommand(sandboxId: string, command: string) {
    if (sandboxId !== 'builder-one') throw new Error('Unknown local builder')
    this.commands.push(command)
    await this.beforeStart?.(command)
    const mapped = command
      .replaceAll('/home/user', this.home)
      .replaceAll('https://machine.conducting.test', this.localOrigin)
      .replaceAll('=https', '=http')
    const executable = command.includes('clone --bare')
      ? mapped.replaceAll(
          sourceRepositoryUrl('example/source-repository'),
          `${this.localOrigin}/repository.git`,
        )
      : mapped
    if (
      /\/(?:home\/user|run|opt)(?:\/|\b)/u.test(
        executable.replaceAll(this.root, '<mapped>'),
      )
    )
      throw new Error('A source command keeps a production path')
    this.mappedCommands.push(executable)
    const process: { promise: Promise<CommandResult>; result?: CommandResult } =
      {
        promise: new Promise((resolve) => {
          const child = execFile(
            '/bin/sh',
            ['-c', executable],
            {
              cwd: this.home,
              env: nativeEnvironment(this.home, this.root),
            },
            (error, stdout, stderr) =>
              resolve({
                exitCode: error
                  ? typeof error.code === 'number'
                    ? error.code
                    : null
                  : 0,
                stdout,
                stderr,
                timedOut: false,
              }),
          )
          child.stdin?.end()
        }),
      }
    this.processes.push(process)
    void process.promise.then((result) => {
      process.result = result
      this.results.push(result)
    })
    if (this.loseStartReply) {
      this.loseStartReply = false
      await process.promise
      throw new Error('The native start reply was lost')
    }
    return { processId: this.processes.length }
  }

  override async getCommandStatus(
    sandboxId: string,
    id: number,
    offsets: CommandOffsets,
  ): Promise<CommandStatus> {
    if (sandboxId !== 'builder-one') throw new Error('Unknown local builder')
    this.statusIds.push(id)
    const result = this.processes[id - 1]?.result
    return readCommandStatus(
      {
        ...offsets,
        type: 'command.status',
        success: true,
        processId: id,
        status: this.lostProcess ? 'lost' : result ? 'exited' : 'running',
        running: !this.lostProcess && !result,
        exitCode: this.lostProcess ? null : (result?.exitCode ?? null),
        stdout: result?.stdout ?? '',
        stderr: this.reportedError ?? result?.stderr ?? '',
        stdoutNextOffset: offsets.stdoutOffset,
        stderrNextOffset: offsets.stderrOffset,
        more: false,
      },
      id,
    )
  }

  async settle(): Promise<void> {
    await Promise.all(this.processes.map((process) => process.promise))
  }
}
