import type { ContractReply } from '../contract-fixture.test-support'
import type { SandboxProvider } from '../provider'
import { FakeE2b } from '../../test-support/fake-e2b'
import { fakeE2bJobPath } from '../../test-support/fake-e2b-envd'
import { fakeE2bFrames } from '../../test-support/fake-e2b-frames'

export async function capabilityReply(
  server: FakeE2b,
  provider: SandboxProvider,
  reply: ContractReply,
): Promise<boolean> {
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  switch (reply.kind) {
    case 'command':
      server.envd.result = reply.value
      return true
    case 'started_command':
      server.envd.nextJobId = reply.value.processId
      return true
    case 'command_status':
      server.envd.setJob(reply.value)
      return true
    case 'file': {
      const file = reply.value
      server.envd.files.set(
        file.path,
        file.encoding === 'base64'
          ? Uint8Array.from(atob(file.content), (value) => value.charCodeAt(0))
          : new TextEncoder().encode(file.content),
      )
      return true
    }
    case 'large_file':
      server.envd.sizes.set(reply.path, reply.sizeBytes)
      return true
    case 'wrong_file':
      server.envd.files.set(reply.path, new Uint8Array([1, 2]))
      server.envd.paths.set(reply.path, '/home/user/other.txt')
      return true
    case 'port':
      await provider.create({
        idempotencyKey: 'fixture-port',
        ttlSeconds: 1800,
      })
      return true
    case 'invalid':
      if (reply.target === 'started_command') {
        server.envd.response = () =>
          fakeE2bFrames([
            { event: { start: { pid: 4321 } } },
            {
              event: {
                data: {
                  stdout: btoa(
                    JSON.stringify({ processId: server.apiKey, pid: 4321 }) +
                      '\n',
                  ),
                },
              },
            },
            { event: { end: { exited: true } } },
          ])
        return true
      }
      if (reply.target === 'command_status') {
        server.envd.files.set(
          fakeE2bJobPath(1234, 'meta.json'),
          new TextEncoder().encode(
            '{"processId":5678,"pid":4321,"startTicks":"999"}',
          ),
        )
        return true
      }
      return false
    default:
      return false
  }
}
