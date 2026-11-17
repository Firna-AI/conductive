import { randomUUID } from 'node:crypto'
import {
  mkdir,
  lstat,
  mkdtemp,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import {
  findSkillFolders,
  isSkillsRepository,
} from '../../src/shared/skill-folders'
import type { ProviderFactory } from './providers/types'
import { skillsGit } from './skills-git'

export type SkillFolders = Readonly<
  ReturnType<typeof findSkillFolders>['skills']
>

interface SkillsOptions {
  home: string
  skillsRepository?: string
  warn: (message: string) => void
}

interface TestOptions {
  githubBaseUrl?: string
  intervalMs?: number
}

export class SkillsRepository {
  folders: SkillFolders = []
  private readonly root: string
  private readonly repository: string
  private readonly options: SkillsOptions
  private readonly testing: TestOptions
  private readonly controller = new AbortController()
  private timer: ReturnType<typeof setInterval> | undefined
  private pending: Promise<void> | undefined
  private initialized = false

  constructor(options: SkillsOptions, testing: TestOptions = {}) {
    this.options = options
    this.testing = testing
    this.root = join(options.home, '.conductive', 'skills')
    this.repository = options.skillsRepository ?? ''
  }

  start(): void {
    if (this.timer || this.controller.signal.aborted) return
    void this.refresh()
    this.timer = setInterval(
      () => void this.refresh(),
      this.testing.intervalMs ?? 5 * 60_000,
    )
    this.timer.unref()
  }

  /** Each provider start captures the last complete copy without waiting for Git. */
  provider(factory: ProviderFactory): ProviderFactory {
    return (options) => factory({ ...options, skillFolders: this.folders })
  }

  refresh(): Promise<void> {
    if (this.controller.signal.aborted) return Promise.resolve()
    this.pending ??= this.update()
      .catch((error: unknown) => {
        if (!this.controller.signal.aborted)
          this.options.warn(
            `The skills repository could not update. The runner will continue. ${error instanceof Error ? error.message : ''}`,
          )
      })
      .finally(() => {
        this.pending = undefined
      })
    return this.pending
  }

  async close(): Promise<void> {
    clearInterval(this.timer)
    this.controller.abort()
    await this.pending
  }

  private git(args: readonly string[]): Promise<string> {
    return skillsGit(args, this.controller.signal, join(this.root, 'git-home'))
  }

  private async update(): Promise<void> {
    const valid = isSkillsRepository(this.repository)
    const named = join(this.root, 'repositories', this.repository)
    const commits = join(named, 'commits')
    const current = join(this.root, 'repository')
    const git = join(named, 'git')
    if (!this.initialized) {
      const selected = await readFile(join(this.root, 'name'), 'utf8').catch(
        (error: unknown) => missing(error),
      )
      if (!valid || selected !== this.repository) {
        await rm(this.root, { recursive: true, force: true })
        if (valid) {
          await mkdir(this.root, { recursive: true })
          await writeFile(join(this.root, 'name'), this.repository)
        }
      }
      if (!valid) {
        if (this.repository)
          this.options.warn(
            'The skills repository name is invalid. No org skills will load.',
          )
        this.initialized = true
        return
      }
      const previous = await readlink(current).catch((error: unknown) =>
        missing(error),
      )
      if (previous && dirname(previous) === commits)
        this.folders = await this.discover(git, basename(previous), previous)
      this.initialized = true
    }
    if (!valid) return
    await mkdir(commits, { recursive: true })
    await this.git(['init', '--bare', '--', git])
    const url = `${this.testing.githubBaseUrl ?? 'https://github.com'}/${this.repository}.git`
    await this.git([
      '-C',
      git,
      'fetch',
      '--depth=1',
      '--no-tags',
      '--',
      url,
      'HEAD',
    ])
    const commit = (
      await this.git([
        '-C',
        git,
        'rev-parse',
        '--verify',
        'FETCH_HEAD^{commit}',
      ])
    ).trim()
    if (!/^[a-f0-9]{40,64}$/u.test(commit))
      throw new Error('The skills commit is unavailable.')
    const snapshot = join(commits, commit)
    if (
      (await readlink(current).catch((error: unknown) => missing(error))) ===
      snapshot
    )
      return
    const staging = await mkdtemp(join(commits, '.copy-'))
    const link = join(this.root, `.repository-${randomUUID()}`)
    try {
      if (!(await lstat(snapshot).catch((error: unknown) => missing(error)))) {
        await this.git([
          '-C',
          git,
          `--work-tree=${staging}`,
          'checkout',
          '--force',
          commit,
          '--',
          '.',
        ])
        await rename(staging, snapshot)
      }
      const folders = await this.discover(git, commit, snapshot)
      await this.git(['-C', git, 'update-ref', `refs/skills/${commit}`, commit])
      await symlink(snapshot, link, 'dir')
      await rename(link, current)
      this.folders = folders
    } finally {
      await rm(staging, { recursive: true, force: true })
      await rm(link, { force: true })
    }
  }

  private async discover(
    git: string,
    commit: string,
    snapshot: string,
  ): Promise<SkillFolders> {
    const paths = (
      await this.git(['-C', git, 'ls-tree', '-r', '--name-only', '-z', commit])
    ).split('\0')
    const { skills, clashes } = findSkillFolders(
      paths,
      this.repository.split('/')[1],
    )
    for (const clash of clashes)
      this.options.warn(
        `The org skill ${clash.name} uses ${clash.keptPath}. The duplicate ${clash.skippedPath} will not load.`,
      )
    return skills.map((skill) => ({
      ...skill,
      path: join(snapshot, skill.path),
    }))
  }
}

function missing(error: unknown): undefined {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
    return undefined
  throw error
}
