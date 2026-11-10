import { execFile } from 'node:child_process'
export interface GitRunOptions {
  input?: Buffer
  literalPathspecs?: boolean
  maxBytes?: number
}

export class GitOutputLimitError extends Error {
  readonly limitBytes: number
  constructor(limitBytes: number) {
    super('The repository output exceeds the read limit.')
    this.limitBytes = limitBytes
  }
}

export class Git {
  readonly root: string
  private readonly environment: Record<string, string>
  readonly signal: AbortSignal | undefined
  constructor(
    root: string,
    environment: Record<string, string> = {},
    signal?: AbortSignal,
  ) {
    this.root = root
    this.environment = environment
    this.signal = signal
  }

  run(args: readonly string[], options: GitRunOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        'git',
        [
          ...(options.literalPathspecs === false
            ? []
            : ['--literal-pathspecs']),
          ...args,
        ],
        {
          cwd: this.root,
          encoding: 'buffer',
          maxBuffer: options.maxBytes ?? 64 * 1024 * 1024,
          signal: this.signal,
          env: { ...process.env, ...this.environment, GIT_OPTIONAL_LOCKS: '0' },
        },
        (error, stdout) => {
          if (
            error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' &&
            error.message.startsWith('stdout') &&
            options.maxBytes !== undefined
          )
            reject(new GitOutputLimitError(options.maxBytes))
          else if (error)
            reject(
              new Error('The repository command failed.', { cause: error }),
            )
          else resolve(stdout)
        },
      )
      child.stdin?.on('error', () => {})
      child.stdin?.end(options.input)
    })
  }

  async mergeBase(branch: string): Promise<string> {
    const remote = `refs/remotes/origin/${branch}`
    const exists = (
      await this.run(['for-each-ref', '--format=%(refname)', '--', remote])
    )
      .toString()
      .trim()
      .split('\n')
      .includes(remote)
    const base = await this.resolve(exists ? remote : branch)
    const head = await this.resolve('HEAD')
    return (await this.run(['merge-base', head, base])).toString().trim()
  }

  async resolve(branch: string): Promise<string> {
    const sha = (
      await this.run([
        'rev-parse',
        '--verify',
        '--end-of-options',
        `${branch}^{commit}`,
      ])
    )
      .toString()
      .trim()
    if (!/^[a-f0-9]{40,64}$/.test(sha))
      throw new Error('The default branch is not available.')
    return sha
  }
}

export function zeroPaths(buffer: Buffer): string[] {
  return buffer
    .toString('utf8')
    .split('\0')
    .filter((path) => path !== '')
}
