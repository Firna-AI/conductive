import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import type { HttpFetch } from '../../env'
import { BoatClient } from '../../sandbox/boat'
import type { CommandResult } from '../../sandbox/provider'
import type { TestHarness } from '../../test-support/harness'
import { repositoryDirectory } from '../commands'
import { advertisement, fragmentedResponse } from './test-data'
import { sourceFixture } from './test-support'

const execute = promisify(execFile)
const productionHome = '/home/user'
const processEnvironment = {
  PATH: '/usr/bin:/bin',
  LC_ALL: 'C',
  TZ: 'UTC',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
}

/** Executes only mapped preparation commands in this test's temporary home. */
class LocalSourceProvider extends BoatClient {
  readonly commands: string[] = []
  readonly mappedCommands: string[] = []
  private readonly homeDirectory: string

  constructor(directory: string, fetch: HttpFetch) {
    super('boat-first', fetch, { id: 'team-one', type: 'org' })
    this.homeDirectory = directory
  }

  override async runCommand(
    sandboxId: string,
    command: string,
  ): Promise<CommandResult> {
    if (sandboxId !== 'builder-one') throw new Error('Unknown local builder')
    const mapped = command.replaceAll(productionHome, this.homeDirectory)
    if (mapped.includes(productionHome))
      throw new Error('A source command still contains the production home')
    this.commands.push(command)
    this.mappedCommands.push(mapped)
    return new Promise((resolve, reject) => {
      execFile(
        '/bin/sh',
        ['-c', mapped],
        {
          cwd: this.homeDirectory,
          env: {
            ...processEnvironment,
            GIT_CEILING_DIRECTORIES: this.homeDirectory,
          },
        },
        (error, stdout, stderr) => {
          const exitCode = error ? error.code : 0
          if (typeof exitCode !== 'number') return reject(error)
          resolve({
            exitCode,
            stdout,
            stderr,
            timedOut: false,
          })
        },
      )
    })
  }
}

export async function localSourceFixture(
  harness: TestHarness,
  privateKey: string,
) {
  const fixture = await sourceFixture(harness, privateKey)
  const root = resolve(
    import.meta.dirname,
    '../../../.context/boat-native-remote-workspaces/milestone-5/orchestrator-round-1/image-fixes/local-sources',
  )
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(`${root}/case-`)
  const provider = new LocalSourceProvider(directory, harness.boat.fetch)
  const state = { oid: fixture.pack.firstOid, empty: false }
  const fetch: HttpFetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/info/refs')) {
      const tags = fixture.pack.tags.filter(
        (tag) => state.oid === fixture.pack.oid || tag.oid !== fixture.pack.oid,
      )
      return fragmentedResponse(
        advertisement(state.oid, { empty: state.empty, tags }),
        'application/x-git-upload-pack-advertisement',
      )
    }
    return fixture.fetch(request)
  }
  const repository = repositoryDirectory(fixture.repository.id).replace(
    productionHome,
    directory,
  )
  return {
    ...fixture,
    input: { ...fixture.input, provider },
    fetch,
    provider,
    state,
    git: async (...args: string[]) =>
      (
        await execute('git', args, {
          cwd: repository,
          env: { ...processEnvironment, GIT_CEILING_DIRECTORIES: directory },
          encoding: 'buffer',
        })
      ).stdout,
    dispose: () => rm(directory, { recursive: true, force: true }),
  }
}

export function expectedSourceTags(
  pack: Awaited<ReturnType<typeof sourceFixture>>['pack'],
  firstOnly = false,
): Buffer {
  return Buffer.concat(
    pack.tags
      .filter(
        (tag) =>
          tag.oid !== 'f'.repeat(40) && (!firstOnly || tag.oid !== pack.oid),
      )
      .map((tag) => Buffer.concat([tag.name, Buffer.from(` ${tag.oid}\n`)]))
      .sort(Buffer.compare),
  )
}
