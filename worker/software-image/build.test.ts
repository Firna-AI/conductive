import { expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { MACHINE_TOKEN_PATTERN } from '../machines/authorization'
import { softwareImageMachineOwner } from '../machines/client'
import { failingMachineRevokes } from '../machines/revoke.test-support'
import { machineTokenStatus } from '../machines/token.test-support'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { SOFTWARE_RELEASE as SOFTWARE } from '../lifecycle/software-release-test-support'
import { SAVED_IMAGE_NAME } from '../lifecycle/image-names'
import { imagePackagesVersion } from '../lifecycle/image-packages'
import { requestSoftwareImage } from './build'
import { softwareImages } from './data'
import { repairSoftwareImages } from './repair'

const fixtureForTest = setupBackendTests()
const digest = 'a'.repeat(64)

it('sends only machine environment and resumes host commands with saved offsets', async () => {
  const { images, boat, host } = fixtureForTest()
  boat.commandRunning = true
  boat.commandOutput = 'first\n'
  const first = await requestSoftwareImage(images, SOFTWARE, digest)
  expect(first.state).toBe('building')
  expect(first.output).toBe('first\n')
  expect(boat.starts).toHaveLength(1)
  expect(boat.starts[0]).toMatchObject({ noEnv: true, ttlSeconds: 1800 })
  expect(boat.starts[0].env).toEqual({
    CONDUCTIVE_MACHINE_ORIGIN: images.env.MACHINE_ORIGIN,
    CONDUCTIVE_MACHINE_TOKEN: expect.stringMatching(
      new RegExp(`^${MACHINE_TOKEN_PATTERN}$`),
    ),
  })
  expect(boat.starts[0]).not.toHaveProperty('from')
  expect(boat.starts[0].labels).not.toHaveProperty('org')
  const attempt = (await softwareImages(images.env.DB, 'boat'))[0]
  expect(attempt.snapshotName).toMatch(SAVED_IMAGE_NAME)
  expect(boat.starts[0].name).toBe(`software-image-${attempt.id}`)
  expect(attempt).toMatchObject({
    phase: 'software',
    processId: 1,
    commandRoute: 'host',
    machineTokenCiphertext: null,
    stdoutOffset: 6,
    output: 'first\n',
    packagesVersion: await imagePackagesVersion(),
  })
  boat.commandOutput += 'last\n'
  boat.commandRunning = false
  const ready = await requestSoftwareImage(images, SOFTWARE, digest)
  expect(ready).toMatchObject({
    state: 'ready',
    phase: 'done',
    output: 'last\n',
  })
  expect(host.statusRequests.at(-1)?.stdoutOffset).toBe(6)
  expect(host.commands.at(-1)).toBe("rm -rf -- '/tmp/conductive-lifecycle'")
  expect(boat.statusRequests).toEqual(host.statusRequests)
  expect(boat.commandRequests).toEqual(host.commandRequests)
  expect(boat.deletedIds).toEqual(['bx_1'])
  await host.disconnect('bx_1')
  await expect(host.connect('bx_1')).rejects.toThrow(
    'Host upgrade returned 401',
  )
  expect(boat.deadlineIds).toContain('bx_1')
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    state: 'ready',
    output: '',
  })
  expect(boat.starts).toHaveLength(1)
})

it('keeps the software image sandbox until repair can revoke its token', async () => {
  const { images, boat, harness } = fixtureForTest()
  expect(
    await requestSoftwareImage(
      { ...images, env: failingMachineRevokes(images.env) },
      SOFTWARE,
      digest,
    ),
  ).toMatchObject({ state: 'ready', phase: 'cleanup' })
  expect(boat.deletedIds).toEqual([])
  const [pending] = await softwareImages(images.env.DB, 'boat')
  expect(pending).toMatchObject({ phase: 'cleanup', sandboxId: 'bx_1' })
  const owner = softwareImageMachineOwner(pending.id)
  const token = string(record(boat.starts[0].env).CONDUCTIVE_MACHINE_TOKEN)
  expect(await machineTokenStatus(harness.env, owner, token)).toBe(101)

  await repairSoftwareImages(images)

  expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
    id: pending.id,
    state: 'ready',
    phase: 'done',
    sandboxId: null,
  })
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(await machineTokenStatus(harness.env, owner, token)).toBe(401)
})

it('hides machine tokens in software image output and keeps the original offsets', async () => {
  const { images, boat } = fixtureForTest()
  const token = `cndm1.${'a'.repeat(64)}.${'b'.repeat(43)}`
  boat.commandRunning = true
  boat.commandOutput = `stdout ${token}\n`
  boat.commandStderr = `stderr ${token}\n`
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    output: 'stdout [hidden]\nstderr [hidden]\n',
  })
  expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
    output: 'stdout [hidden]\nstderr [hidden]\n',
    stdoutOffset: 122,
    stderrOffset: 122,
  })
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    output: '',
  })
})

it('masks split tokens in software image replies and kept output across stderr', async () => {
  const { images, boat, host } = fixtureForTest()
  const token = `cndm1.${'a'.repeat(64)}.${'b'.repeat(43)}`
  boat.commandRunning = true
  boat.commandOutput = `stdout🙂\n${token.slice(0, 70)}`
  boat.commandStderr = `stderr ${token}\n`
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    state: 'building',
    output: 'stdout🙂\nstderr [hidden]\n',
  })
  expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
    output: 'stdout🙂\nstderr [hidden]\n',
    stdoutOffset: 11,
    stderrOffset: 122,
  })

  boat.commandOutput = `stdout🙂\n${token}\ncndm1.abc`
  boat.commandRunning = false
  boat.commandExitCode = 1
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    state: 'failed',
    output: '[hidden]\ncndm1.abc',
    keptOutput: 'stdout🙂\nstderr [hidden]\n[hidden]\ncndm1.abc',
  })
  expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
    output: 'stdout🙂\nstderr [hidden]\n[hidden]\ncndm1.abc',
    stdoutOffset: 135,
    stderrOffset: 122,
  })
  expect(host.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
    { processId: 1, stdoutOffset: 11, stderrOffset: 122 },
  ])
})

it('keeps failed output within 64 KiB and retries only for a new deploy token digest', async () => {
  const { images, boat } = fixtureForTest()
  boat.commandExitCode = 1
  boat.commandOutput = '😀'.repeat(20 * 1024) + 'end!\n'
  const failed = await requestSoftwareImage(images, SOFTWARE, digest)
  expect(failed.state).toBe('failed')
  expect(failed.error).toBe('The software image build failed.')
  expect(
    new TextEncoder().encode(failed.keptOutput).length,
  ).toBeLessThanOrEqual(64 * 1024)
  expect(failed.keptOutput).toMatch(/😀end!\n$/)
  expect(failed.keptOutput).not.toContain('�')
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(await requestSoftwareImage(images, SOFTWARE, digest)).toMatchObject({
    state: 'failed',
    keptOutput: failed.keptOutput,
  })
  expect(boat.starts).toHaveLength(1)
  boat.commandExitCode = 0
  expect(
    (await requestSoftwareImage(images, SOFTWARE, 'b'.repeat(64))).state,
  ).toBe('ready')
  expect(boat.starts).toHaveLength(2)
})

it('replaces an unfinished version and cleans its sandbox', async () => {
  const { images, boat } = fixtureForTest()
  boat.commandRunning = true
  expect((await requestSoftwareImage(images, SOFTWARE, digest)).state).toBe(
    'building',
  )
  boat.commandRunning = false
  const next = { ...SOFTWARE, sha256: 'b'.repeat(64) }
  expect((await requestSoftwareImage(images, next, 'c'.repeat(64))).state).toBe(
    'ready',
  )
  const attempts = await softwareImages(images.env.DB, 'boat')
  expect(attempts.map((image) => image.state)).toEqual(['ready', 'failed'])
  expect(attempts[1].error).toBe(
    'The software image build was replaced by another software version.',
  )
  expect(boat.deletedIds).toEqual(['bx_1', 'bx_2'])
})

it('keeps a transient provider error and recovers an uncertain allocation with the same request', async () => {
  const { images, boat } = fixtureForTest()
  boat.lostCreateReplies = 1
  expect((await requestSoftwareImage(images, SOFTWARE, digest)).state).toBe(
    'building',
  )
  expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
    phase: 'allocating',
    sandboxId: null,
  })
  expect((await requestSoftwareImage(images, SOFTWARE, digest)).state).toBe(
    'ready',
  )
  expect(boat.starts).toHaveLength(2)
  expect(boat.starts[1]).toEqual(boat.starts[0])
  expect(boat.deletedIds).toEqual(['bx_1'])
})
