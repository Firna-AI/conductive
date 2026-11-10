import type { SandboxProvider } from '../../worker/sandbox/provider'
import { ProviderError } from '../../worker/sandbox/errors'
import { CheckError, object, until } from '../live-input'

export const probeDirectory = '/run/conductive-e2b-live'
export const probeRepository = '/home/user/conductive-e2b-live'

export async function command(
  provider: Pick<SandboxProvider, 'runCommand'>,
  id: string,
  source: string,
): Promise<string> {
  const result = await provider.runCommand(id, source)
  if (result.exitCode !== 0 || result.timedOut)
    throw new CheckError(
      'An E2B image probe failed. Its raw output was suppressed.',
    )
  return result.stdout
}

export async function upload(
  provider: SandboxProvider,
  id: string,
  name: string,
  source: string,
): Promise<void> {
  await command(
    provider,
    id,
    `sudo -n install -d -m 700 -o user -g user ${probeDirectory}`,
  )
  const bytes = new TextEncoder().encode(source)
  await provider.writeFile(
    id,
    `${probeDirectory}/${name}`,
    new Blob([bytes]).stream(),
    bytes.byteLength,
  )
}

export async function jsonFile(
  provider: SandboxProvider,
  id: string,
  path: string,
) {
  return until(async () => {
    try {
      const result = await provider.readFile(id, path, 4096)
      if (result.kind !== 'file')
        throw new CheckError('The E2B probe result is too large.')
      const text =
        result.file.encoding === 'base64'
          ? Buffer.from(result.file.content, 'base64').toString('utf8')
          : result.file.content
      return object(JSON.parse(text))
    } catch (error) {
      if (error instanceof ProviderError && error.kind === 'not_found')
        return null
      throw error
    }
  }, 'the E2B probe result')
}

export async function ready(
  provider: SandboxProvider,
  id: string,
  stopped = false,
): Promise<void> {
  await until(
    async () => {
      const sandbox = await provider.get(id)
      if (sandbox.state === 'error' || sandbox.state === 'cancelled')
        throw new CheckError('The E2B probe computer entered an error state.')
      return sandbox.state === (stopped ? 'archived' : 'ready') ? true : null
    },
    stopped ? 'the E2B pause' : 'the E2B start',
  )
}

export function requireFlags(
  value: Record<string, unknown>,
  names: readonly string[],
): Record<string, true> {
  if (names.some((name) => value[name] !== true))
    throw new CheckError(
      'An E2B runtime assertion failed. Only safe probe facts were retained.',
    )
  return Object.fromEntries(names.map((name) => [name, true]))
}
