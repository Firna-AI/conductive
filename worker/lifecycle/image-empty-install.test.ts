import { expect, it } from 'vitest'

import { seedReadySoftwareImage } from '../software-image/test-support'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const fixtureForTest = setupBackendTests()

it.each([
  ['build', true],
  ['build', false],
  ['refresh', true],
  ['refresh', false],
] as const)(
  'skips an empty install script and its log for a %s with ready software %s',
  async (kind, ready) => {
    const fixture = fixtureForTest()
    const { images, org, user, boat } = fixture
    const name = ready ? await seedReadySoftwareImage(images.env.DB) : undefined
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind,
      software: SOFTWARE,
    })
    await finishImageBuild(fixture, id)
    expect(boat.starts[0].from).toBe(name)
    const commands = boat.commandRequests.filter((command) => command.detached)
    expect(commands).toHaveLength(ready ? 0 : 1)
    expect(
      commands.some((command) =>
        command.command.includes('/tmp/conductive-install.sh'),
      ),
    ).toBe(false)
    const result = await readBuild(images.env.DB, org.id, id)
    expect(result.build.state).toBe('succeeded')
    expect(result.log.map((event) => event.text).join('')).not.toContain(
      'Running the install script.',
    )
  },
)
