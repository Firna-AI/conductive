import type { SandboxProvider } from '../../sandbox/provider'
import { repositoryDirectory, shellQuote } from '../commands'
import type { SelectedRepository } from '../settings-data'
import type { SourceRef } from './refs'
import { sourceTagCommands } from './tags'

const ROOT = repositoryDirectory('').replace(/\/$/u, '')
const GIT =
  'git -c core.hooksPath=/dev/null -c credential.helper= -c core.askPass=true'
const PREFIX =
  'set -eu\nexport GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null'

export async function runBuilderCommand(
  provider: SandboxProvider,
  sandboxId: string,
  command: string,
): Promise<void> {
  const result = await provider.runCommand(sandboxId, `${PREFIX}\n${command}`)
  if (result.exitCode !== 0 || result.timedOut)
    throw new Error('Repository preparation failed')
}

export function pruneSourcesCommand(
  repositories: readonly SelectedRepository[],
): string {
  const retained = repositories
    .map(
      (repository) =>
        `! -name ${shellQuote(encodeURIComponent(repository.id).replaceAll('*', '\\*'))}`,
    )
    .join(' ')
  return `mkdir -p ${shellQuote(ROOT)}\nfind ${shellQuote(ROOT)} -mindepth 1 -maxdepth 1 ${retained} -exec rm -rf -- {} +`
}

export function initializeSourceCommand(
  repository: SelectedRepository,
  url: string,
  ref: Pick<SourceRef, 'objectFormat'>,
): string {
  const directory = shellQuote(repositoryDirectory(repository.id))
  const branch = shellQuote(repository.defaultBranch)
  const remoteRef = shellQuote(`refs/heads/${repository.defaultBranch}`)
  return [
    `${GIT} check-ref-format ${remoteRef}`,
    `mkdir -p ${directory}`,
    `if [ ! -d ${directory}/.git ]; then ${GIT} init --template= --object-format=${ref.objectFormat} --initial-branch=${branch} ${directory}; fi`,
    `cd ${directory}`,
    `${GIT} config --local --replace-all remote.origin.url ${shellQuote(url)}`,
    `${GIT} config --local --replace-all remote.origin.fetch ${shellQuote(`+refs/heads/${repository.defaultBranch}:refs/remotes/origin/${repository.defaultBranch}`)}`,
    ': > .git/conducting-image-source.pack',
    ': > .git/conducting-image-source.tags',
  ].join('\n')
}

export function completeSourceCommand(
  repository: SelectedRepository,
  ref: SourceRef,
): string {
  const branch = shellQuote(repository.defaultBranch)
  const localRef = shellQuote(`refs/heads/${repository.defaultBranch}`)
  const remoteRef = shellQuote(
    `refs/remotes/origin/${repository.defaultBranch}`,
  )
  return [
    `cd ${shellQuote(repositoryDirectory(repository.id))}`,
    ...(ref.oid
      ? [
          `${GIT} index-pack --stdin < .git/conducting-image-source.pack`,
          `${GIT} update-ref ${remoteRef} ${shellQuote(ref.oid)}`,
          `${GIT} symbolic-ref refs/remotes/origin/HEAD ${remoteRef}`,
          `${GIT} checkout --force -B ${branch} ${shellQuote(ref.oid)} --`,
        ]
      : [
          `${GIT} rm -r -f --ignore-unmatch -- .`,
          `${GIT} update-ref -d ${localRef}`,
          `${GIT} update-ref -d ${remoteRef}`,
          `if ${GIT} symbolic-ref -q refs/remotes/origin/HEAD > /dev/null; then ${GIT} symbolic-ref --delete refs/remotes/origin/HEAD; fi`,
          `${GIT} symbolic-ref HEAD ${localRef}`,
        ]),
    ...sourceTagCommands(GIT),
    `${GIT} config --local --replace-all ${shellQuote(`branch.${repository.defaultBranch}.remote`)} origin`,
    `${GIT} config --local --replace-all ${shellQuote(`branch.${repository.defaultBranch}.merge`)} ${localRef}`,
    'rm -f -- .git/conducting-image-source.pack',
  ].join('\n')
}

/** Each shell argument stays below Linux's per-argument limit. */
export class SourceFileWriter {
  private readonly buffer = new Uint8Array(64 * 1024)
  private filled = 0
  private readonly provider: SandboxProvider
  private readonly sandboxId: string
  private readonly path: string

  constructor(
    provider: SandboxProvider,
    sandboxId: string,
    repository: SelectedRepository,
    kind: 'pack' | 'tags',
  ) {
    this.provider = provider
    this.sandboxId = sandboxId
    this.path = shellQuote(
      `${repositoryDirectory(repository.id)}/.git/conducting-image-source.${kind}`,
    )
  }

  async write(bytes: Uint8Array): Promise<void> {
    let offset = 0
    while (offset < bytes.length) {
      const count = Math.min(
        bytes.length - offset,
        this.buffer.length - this.filled,
      )
      this.buffer.set(bytes.subarray(offset, offset + count), this.filled)
      offset += count
      this.filled += count
      if (this.filled === this.buffer.length) await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (!this.filled) return
    const encoded = btoa(
      String.fromCharCode(...this.buffer.subarray(0, this.filled)),
    )
    await runBuilderCommand(
      this.provider,
      this.sandboxId,
      `printf %s ${shellQuote(encoded)} | base64 -d >> ${this.path}`,
    )
    this.filled = 0
  }
}
