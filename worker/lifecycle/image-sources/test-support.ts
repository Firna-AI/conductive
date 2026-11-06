import type { HttpFetch } from '../../env'
import { isRecord } from '../../http'
import { BoatClient } from '../../sandbox/boat'
import type { TestHarness } from '../../test-support/harness'
import type { SelectedRepository } from '../settings-data'
import {
  advertisement,
  fragmentedResponse,
  INSTALLATION_TOKEN,
  pkt,
  SOURCE_BRANCH,
  sourcePack,
  uploadResponse,
} from './test-data'

export async function sourceFixture(harness: TestHarness, privateKey: string) {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const repository: SelectedRepository = {
    id: "source one'with spaces",
    orgId: org.id,
    fullName: 'example/source-repository',
    defaultBranch: SOURCE_BRANCH,
  }
  await harness.env.DB.prepare(
    `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, default_branch, installation_id, selected)
     VALUES (?, ?, 101, ?, ?, 701, 1)`,
  )
    .bind(repository.id, org.id, repository.fullName, repository.defaultBranch)
    .run()
  await harness.env.DB.prepare(
    `INSERT INTO image_builds
       (id, org_id, kind, state, sandbox_id, settings_revision, runner_protocol_version, started_at)
     VALUES ('build-one', ?, 'build', 'running', 'builder-one', 1, 1, 1800000000000)`,
  )
    .bind(org.id)
    .run()
  const pack = sourcePack()
  const requests: Request[] = []
  const options = {
    sideband: true,
    empty: false,
    tokenFailure: false,
    corrupt: false,
    sidebandFailure: false,
  }
  const fetch: HttpFetch = async (request) => {
    requests.push(request.clone())
    const url = new URL(request.url)
    if (url.hostname === 'api.github.com') {
      if (options.tokenFailure)
        return new Response(INSTALLATION_TOKEN, { status: 403 })
      return Response.json({ token: INSTALLATION_TOKEN }, { status: 201 })
    }
    if (url.pathname.endsWith('/info/refs')) {
      return fragmentedResponse(
        advertisement(pack.oid, { ...options, tags: pack.tags }),
        'application/x-git-upload-pack-advertisement',
      )
    }
    const bytes = options.corrupt
      ? new Uint8Array([48, 48, 48, 56, 78, 65])
      : options.sidebandFailure
        ? Buffer.concat([
            Buffer.from('0008NAK\n'),
            pkt(`\x03${INSTALLATION_TOKEN}`),
          ])
        : uploadResponse(pack.bytes, options.sideband)
    return fragmentedResponse(bytes, 'application/x-git-upload-pack-result')
  }
  return {
    env: { ...harness.env, GITHUB_APP_PRIVATE_KEY: privateKey },
    input: {
      orgId: org.id,
      buildId: 'build-one',
      sandboxId: 'builder-one',
      repositories: [repository],
      provider: new BoatClient('boat-first', harness.boat.fetch, {
        id: 'team-one',
        type: 'org',
      }),
    },
    repository,
    pack,
    tagMetadata: new Uint8Array(
      Buffer.concat(
        pack.tags.map((tag) =>
          Buffer.concat([
            Buffer.from(`${tag.oid} `),
            tag.name,
            Buffer.from('\n'),
          ]),
        ),
      ),
    ),
    fetch,
    requests,
    options,
    commands: async () => {
      const commands: string[] = []
      for (const request of harness.boat.requests) {
        const value: unknown = await request.clone().json()
        if (!isRecord(value) || typeof value.command !== 'string')
          throw new Error('Missing builder command')
        commands.push(value.command)
      }
      return commands
    },
  }
}

export function transferredPack(commands: readonly string[]): Uint8Array {
  return transferredFile(commands, 'conducting-image-source.pack')
}

export function transferredTags(commands: readonly string[]): Uint8Array {
  return transferredFile(commands, 'conducting-image-source.tags')
}

function transferredFile(
  commands: readonly string[],
  name: string,
): Uint8Array {
  const chunks: Buffer[] = []
  for (const command of commands) {
    const upload = command.match(/printf %s '([^']*)' \| base64 -d >>/u)
    if (upload && command.includes(name))
      chunks.push(Buffer.from(upload[1], 'base64'))
  }
  return new Uint8Array(Buffer.concat(chunks))
}
