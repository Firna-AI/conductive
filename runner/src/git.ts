import { execFile } from 'node:child_process'
export interface GitRunOptions {
  input?: Buffer
  literalPathspecs?: boolean
}

export class Git {
  readonly root: string
  private readonly environment: Record<string, string>
  constructor(root: string, environment: Record<string, string> = {}) {
    this.root = root
    this.environment = environment
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
          maxBuffer: 64 * 1024 * 1024,
          env: { ...process.env, ...this.environment, GIT_OPTIONAL_LOCKS: '0' },
        },
        (error, stdout) => {
          if (error)
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
