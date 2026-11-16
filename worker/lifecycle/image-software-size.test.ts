import { expect, it } from 'vitest'

import { lifecycleCommand } from './command-intents'
import { installImageSoftware } from './image-software'

/**
 * The sandbox provider starts each command as one process argument, and
 * Linux refuses an argument of 128 KiB or more. A software image command of
 * 95,464 bytes ran on the provider, so each image build keeps its command at
 * 96 KiB or less. Release files download separately from the command.
 */
const commandLimit = 96 * 1_024

it('keeps the software command of each image build under the argument limit', () => {
  const digest = 'a'.repeat(64)
  const software = installImageSoftware({
    version: '0.0.1',
    server: 'https://software.example',
    url: `https://software.example/runner-${digest}.tar.gz`,
    sha256: digest,
  })
  const id = 'b'.repeat(43)
  for (const owner of [
    { kind: 'build', id },
    { kind: 'software-image', id },
  ] as const) {
    const command = lifecycleCommand(owner, 'software', software)
    expect(new TextEncoder().encode(command).length).toBeLessThanOrEqual(
      commandLimit,
    )
  }
})
