import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execute = promisify(execFile)

export class Git {
  readonly root: string
  constructor(root: string) {
    this.root = root
  }

  async run(args: readonly string[], allowDifference = false): Promise<Buffer> {
    try {
      const result = await execute('git', ['--literal-pathspecs', ...args], {
        cwd: this.root,
        encoding: 'buffer',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      })
      return result.stdout
    } catch (error) {
      if (
        allowDifference &&
        error instanceof Error &&
        'code' in error &&
        error.code === 1 &&
        'stdout' in error &&
        Buffer.isBuffer(error.stdout)
      ) {
        return error.stdout
      }
      throw new Error('The repository command failed.', { cause: error })
    }
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
