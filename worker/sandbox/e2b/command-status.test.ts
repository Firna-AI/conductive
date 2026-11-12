import { expect, it } from 'vitest'

import { fakeE2bJobPath } from '../../test-support/fake-e2b-envd'
import { E2bClient } from './client'
import { e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('returns the final command result published before a failed supervisor liveness read', async () => {
  for (const liveness of ['missing', 'reused'] as const) {
    const { server, options } = fixture()
    server.sandboxes.set('sandbox-one', {
      sandboxID: 'sandbox-one',
      state: 'running',
      metadata: {},
    })
    server.envd.setJob({
      processId: 1234,
      state: 'running',
      running: true,
      exitCode: null,
      timedOut: null,
      stdout: 'compiled\n',
      stderr: 'warning\n',
      stdoutOffset: 0,
      stderrOffset: 0,
      stdoutNextOffset: 9,
      stderrNextOffset: 8,
      more: false,
    })
    const reads: string[] = []
    const exitPath = fakeE2bJobPath(1234, 'exit.json')
    const client = new E2bClient({
      ...options,
      fetch: async (request) => {
        const url = new URL(request.url)
        const path = url.searchParams.get('path')
        if (url.pathname === '/files' && path === '/proc/4321/stat') {
          server.envd.files.set(
            exitPath,
            new TextEncoder().encode(
              '{"processId":1234,"exitCode":0,"timedOut":false}',
            ),
          )
          server.envd.files.delete('/proc/4321/stat')
          if (liveness === 'reused')
            server.envd.files.set(
              '/proc/4321/stat',
              new TextEncoder().encode(
                `4321 (python3) S ${Array.from({ length: 18 }, () => '0').join(' ')} 1000`,
              ),
            )
        }
        const response = await server.fetch(request)
        if (url.pathname === '/files' && path === exitPath)
          reads.push(`exit:${response.status}`)
        if (url.pathname === '/files' && path === '/proc/4321/stat')
          reads.push(`proc:${response.status}`)
        return response
      },
    })

    await expect(
      client.getCommandStatus('sandbox-one', 1234, {
        stdoutOffset: 0,
        stderrOffset: 0,
      }),
      liveness,
    ).resolves.toEqual({
      processId: 1234,
      state: 'exited',
      running: false,
      exitCode: 0,
      timedOut: false,
      stdout: 'compiled\n',
      stderr: 'warning\n',
      stdoutOffset: 0,
      stderrOffset: 0,
      stdoutNextOffset: 9,
      stderrNextOffset: 8,
      more: false,
    })
    expect(reads, liveness).toEqual([
      'exit:404',
      liveness === 'missing' ? 'proc:404' : 'proc:200',
      'exit:200',
    ])
  }
})
