import { expect, it } from 'vitest'

import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildJob } from './build-data'
import { shellQuote } from './commands'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { IMAGE_NODE_RUNTIME } from './image-runtime'
import { lifecycleCommandBody } from './command-test-support'
import { TOOLS_COMMAND_COUNT } from '../tools/image-commands.test-support'

const backendFixture = setupBackendTests()

it('runs terminal installation inside the detached software command and streams its output without starting a terminal', async () => {
  const fixture = await backendFixture()
  const { images, org, user, boat, runtime } = fixture
  const buildId = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  for (let step = 0; step < 6; step++) {
    const job = await readBuildJob(runtime.env.DB, org.id, buildId)
    if (job.phase === 'software' && job.processId !== null) break
    await advanceImageBuild(images, org.id, buildId)
  }
  expect(await readBuildJob(runtime.env.DB, org.id, buildId)).toMatchObject({
    phase: 'software',
    processId: 1,
  })
  expect(boat.commandRequests).toEqual([
    ...Array.from({ length: TOOLS_COMMAND_COUNT }, () => ({
      sandboxId: 'bx_1',
      detached: false,
      command: expect.stringContaining('/opt/conductive/agent-tools/'),
    })),
    {
      sandboxId: 'bx_1',
      detached: true,
      command: expect.stringContaining(
        '/usr/local/lib/conductive/terminal-password',
      ),
    },
  ])
  const software = boat.commands[TOOLS_COMMAND_COUNT]
  expect(lifecycleCommandBody(software)).toContain(
    'RuntimeDirectoryPreserve=yes',
  )
  expect(lifecycleCommandBody(software)).toContain(
    [
      IMAGE_NODE_RUNTIME.url,
      IMAGE_NODE_RUNTIME.sha256,
      IMAGE_NODE_RUNTIME.directory,
    ]
      .map(shellQuote)
      .join(' '),
  )
  expect(lifecycleCommandBody(software)).not.toContain(
    'systemctl start conductive-terminal.service',
  )
  expect(boat.fileReads).toEqual([])
  boat.commandRunning = true
  boat.commandOutput = 'terminal installer output\n'
  await advanceImageBuild(images, org.id, buildId)
  const running = await readBuild(runtime.env.DB, org.id, buildId)
  expect(running.build.state).toBe('running')
  expect(running.log).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ text: 'terminal installer output\n' }),
    ]),
  )
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM terminal_credentials',
    ).first<number>('count'),
  ).toBe(0)
})
