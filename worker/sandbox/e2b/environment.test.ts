import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { PREVIEW_INGRESS_PATH } from '../../../src/shared/preview-ingress'
import { PREVIEW_RELAY_PORT } from '../../../src/shared/previews'
import { createInput, e2bFixture } from './client.test-support'
import { execute, runtimeDirectory } from './runtime.test-support'

const fixture = e2bFixture()

it('quotes env file values for a real shell and keeps those values out of process arguments', async () => {
  const { client, server } = fixture()
  const directory = await runtimeDirectory()
  const sentinel = join(directory, 'must-not-exist')
  const env = { QUOTED: "a'b\nnext line", COMMAND: `$(touch ${sentinel})` }
  await client.create({ ...createInput, env })
  const content = server.envd.files.get('/run/ascii-secrets/env.sh')
  if (!content) throw new Error('Missing uploaded environment.')
  const path = join(directory, 'env.sh')
  await writeFile(path, content)
  const result = await execute(
    '/bin/sh',
    [
      '-c',
      `. "$1"; python3 -c 'import json,os; print(json.dumps({key:os.environ[key] for key in ["QUOTED","COMMAND"]}))'`,
      'shell',
      path,
    ],
    { encoding: 'utf8' },
  )
  expect(JSON.parse(result.stdout)).toEqual(env)
  await expect(access(sentinel)).rejects.toMatchObject({ code: 'ENOENT' })
  for (const request of server.requests.filter(
    (value) => new URL(value.url).pathname === '/process.Process/Start',
  )) {
    const body = await request.text()
    expect(body).not.toContain('next line')
    expect(body).not.toContain('must-not-exist')
  }
  expect(await readFile(path, 'utf8')).toContain('next line')
})

it('keeps the previous env file and removes the protected temp after a failed upload', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  const previous = server.envd.files.get('/run/ascii-secrets/env.sh')
  server.envd.uploadPath = '/home/user/wrong'
  await expect(
    client.resume('sandbox-one', { CURRENT: 'new value' }, 60),
  ).rejects.toMatchObject({ kind: 'invalid_response', status: 502 })
  expect(server.envd.files.get('/run/ascii-secrets/env.sh')).toEqual(previous)
  expect(
    [...server.envd.files.keys()].filter((path) =>
      path.startsWith('/run/ascii-secrets/.env-'),
    ),
  ).toEqual([])
})

it('registers the exact current outer alias before returning the shared preview descriptor', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  for (const alias of [41235, 41236]) {
    server.envd.result = {
      stdout: JSON.stringify({
        targetPort: PREVIEW_RELAY_PORT,
        listenPort: alias,
      }),
      stderr: '',
      exitCode: 0,
      timedOut: false,
    }
    await expect(
      client.privatePort('sandbox-one', PREVIEW_RELAY_PORT, 'localhost'),
    ).resolves.toMatchObject({
      origin: `https://${alias}-sandbox-one.eu.e2b.test`,
    })
    const metadata = server.envd.files.get(PREVIEW_INGRESS_PATH)
    if (!metadata) throw new Error('Missing preview metadata.')
    expect(JSON.parse(new TextDecoder().decode(metadata))).toEqual({
      sandboxId: 'sandbox-one',
      domain: 'eu.e2b.test',
      aliases: { [String(PREVIEW_RELAY_PORT)]: alias },
    })
  }
})
