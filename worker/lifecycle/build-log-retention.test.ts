import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  failBuild,
  readBuild,
  readBuildJob,
  saveBuildOutput,
  writeBuildLog,
} from './build-data'
import { buildEventsResponse } from './build-stream'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('bounds accumulated output and streams retained ends with the omitted byte count', async () => {
  const { runtime, images, org, user } = await fixtureForTest()
  const db = runtime.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await writeBuildLog(db, id, 'Start🙂\n', TEST_TIME)
  const outputs = [
    'é'.repeat(1_048_576),
    '🙂'.repeat(524_288),
    `${'終'.repeat(699_050)}!\n`,
  ]
  let cursor = 0
  const summaries: string[][] = []
  for (const [index, stdout] of outputs.entries()) {
    await saveBuildOutput(
      db,
      id,
      {
        processId: 7,
        state: 'running',
        running: true,
        exitCode: null,
        timedOut: false,
        stdout,
        stderr: '',
        stdoutOffset: index * 2_097_152,
        stderrOffset: 0,
        stdoutNextOffset: (index + 1) * 2_097_152,
        stderrNextOffset: 0,
        more: false,
      },
      TEST_TIME + index,
    )
    const stored = await db
      .prepare(
        'SELECT SUM(LENGTH(CAST(text AS BLOB))) AS bytes FROM image_build_logs WHERE build_id = ?',
      )
      .bind(id)
      .first<{ bytes: number }>()
    expect(stored?.bytes).toBeLessThanOrEqual(4_194_304)
    const snapshot = await readBuild(db, org.id, id)
    expect(
      new TextEncoder().encode(snapshot.log.map((event) => event.text).join(''))
        .byteLength,
    ).toBeLessThanOrEqual(4_194_304)
    if (index === 0) cursor = snapshot.log.at(-1)?.eventNumber ?? 0
    summaries.push(
      snapshot.log
        .map((event) => event.text)
        .filter((text) => text.includes('output bytes omitted')),
    )
  }
  expect(summaries).toEqual([
    [],
    ['\n[524288 output bytes omitted]\n'],
    ['\n[2621439 output bytes omitted]\n'],
  ])
  await failBuild(db, id, 'Final🙂\n', TEST_TIME + 3)

  const completed = await readBuild(db, org.id, id)
  expect(completed.build.state).toBe('failed')
  expect(completed.log.map((event) => event.eventNumber)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  ])
  const text = completed.log.map((event) => event.text).join('')
  expect(text.startsWith(`Start🙂\n${'é'.repeat(917_504)}`)).toBe(true)
  expect(text).toContain('\n[2621439 output bytes omitted]\n')
  expect(text.endsWith(`${'終'.repeat(611_669)}!\nFinal🙂\n`)).toBe(true)
  expect(text).not.toContain('�')
  expect(await readBuildJob(db, org.id, id)).toMatchObject({
    stdoutOffset: 6_291_456,
    stderrOffset: 0,
  })

  const response = await buildEventsResponse({
    env: runtime.env,
    orgId: org.id,
    userId: user.id,
    buildId: id,
    after: cursor,
    wait: async () => {},
  })
  const stream = await response.text()
  expect(stream.match(/^id: \d+/gm)).toEqual([
    'id: 18',
    'id: 19',
    'id: 20',
    'id: 21',
    'id: 22',
    'id: 23',
    'id: 24',
    'id: 25',
    'id: 26',
    'id: 27',
  ])
  expect(stream.startsWith('id: 18\nevent: log\n')).toBe(true)
  expect(stream).toContain('[2621439 output bytes omitted]')
  expect(
    stream.endsWith(
      `event: build\ndata: ${JSON.stringify(completed.build)}\n\n`,
    ),
  ).toBe(true)

  const resumed = await buildEventsResponse({
    env: runtime.env,
    orgId: org.id,
    userId: user.id,
    buildId: id,
    after: 26,
    wait: async () => {},
  })
  expect(await resumed.text()).toBe(
    `id: 27\nevent: log\ndata: ${JSON.stringify({ eventNumber: 27, occurredAt: TEST_TIME + 3, text: 'Final🙂\n' })}\n\nevent: build\ndata: ${JSON.stringify(completed.build)}\n\n`,
  )
})
