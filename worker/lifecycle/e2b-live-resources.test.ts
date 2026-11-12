import { expect, it } from 'vitest'

import { checkResources } from '../../image/e2b/live-probes'

it('checks the provisioned MiB disk size and records smaller formatted capacity without rejecting it', async () => {
  await expect(
    checkResources(
      {
        runCommand: async () => ({
          exitCode: 0,
          timedOut: false,
          stdout: '50950000000\n',
          stderr: '',
        }),
      },
      { apiKey: 'fake-key', domain: 'eu.e2b.test' },
      'sandbox-one',
      async () =>
        Response.json({ cpuCount: 4, memoryMB: 8192, diskSizeMB: 48_640 }),
    ),
  ).resolves.toEqual({
    cpuCount: 4,
    memoryMB: 8192,
    diskSizeMiB: 48_640,
    provisionedDiskBytes: 51_002_736_640,
    filesystemCapacityBytes: 50_950_000_000,
  })
})
