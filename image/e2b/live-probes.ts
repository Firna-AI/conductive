import source from './runtime-probe.py?raw'

import { PREVIEW_INGRESS_PATH } from '../../src/shared/preview-ingress'
import { E2bControl } from '../../worker/sandbox/e2b/control'
import type { SandboxProvider } from '../../worker/sandbox/provider'
import type { HttpFetch } from '../../worker/env'
import { shellQuote } from '../../worker/lifecycle/commands'
import { CheckError, object, until } from '../live-input'
import { command, probeDirectory, requireFlags, upload } from './live-command'
import type { E2bLiveConfiguration } from './live-input'

export async function probe(
  provider: SandboxProvider,
  id: string,
  mode: string,
  arguments_: readonly string[] = [],
) {
  await upload(provider, id, 'runtime-probe.py', source)
  return object(
    JSON.parse(
      await command(
        provider,
        id,
        [
          '/usr/bin/python3',
          `${probeDirectory}/runtime-probe.py`,
          mode,
          ...arguments_,
        ]
          .map(shellQuote)
          .join(' '),
      ),
    ),
  )
}

export async function checkBoot(provider: SandboxProvider, id: string) {
  return until(async () => {
    const value = await probe(provider, id, 'boot')
    return value.systemd === true &&
      value.runTmpfs === true &&
      value.servicesActive === true
      ? requireFlags(value, ['systemd', 'runTmpfs', 'servicesActive'])
      : null
  }, 'the E2B boot services')
}

export async function checkEnvironment(
  provider: SandboxProvider,
  id: string,
  expected: string,
) {
  const value = await probe(provider, id, 'environment', [
    expected,
    PREVIEW_INGRESS_PATH,
  ])
  return requireFlags(value, ['envCurrent', 'envPrivate', 'ingressPrivate'])
}

export async function checkResources(
  provider: Pick<SandboxProvider, 'runCommand'>,
  config: Pick<E2bLiveConfiguration, 'apiKey' | 'domain'>,
  id: string,
  fetch_: HttpFetch = (request) => fetch(request),
) {
  const control = new E2bControl(config.apiKey, config.domain, fetch_)
  const value = object(
    (await control.request({ operation: 'get', sandboxId: id })).value,
  )
  if (value.cpuCount !== 4 || value.memoryMB !== 8192)
    throw new CheckError('The E2B sandbox does not report 4 CPUs and 8192 MiB.')
  const diskSizeMiB = value.diskSizeMB
  if (
    typeof diskSizeMiB !== 'number' ||
    !Number.isSafeInteger(diskSizeMiB) ||
    diskSizeMiB < 0
  )
    throw new CheckError(
      'The E2B sandbox has an invalid provisioned disk size.',
    )
  const provisionedDiskBytes = diskSizeMiB * 1024 * 1024
  if (!Number.isSafeInteger(provisionedDiskBytes))
    throw new CheckError(
      'The E2B sandbox has an invalid provisioned disk size.',
    )
  if (provisionedDiskBytes < 51_000_000_000)
    throw new CheckError(
      'The provisioned E2B disk is smaller than the requested 51 GB.',
    )
  const filesystemCapacityBytes = Number(
    (
      await command(
        provider,
        id,
        '/usr/bin/python3 -c \'import os;s=os.statvfs("/");print(s.f_blocks*s.f_frsize)\'',
      )
    ).trim(),
  )
  if (
    !Number.isSafeInteger(filesystemCapacityBytes) ||
    filesystemCapacityBytes < 0
  )
    throw new CheckError('The E2B filesystem capacity observation is invalid.')
  return {
    cpuCount: value.cpuCount,
    memoryMB: value.memoryMB,
    diskSizeMiB,
    provisionedDiskBytes,
    filesystemCapacityBytes,
  }
}
