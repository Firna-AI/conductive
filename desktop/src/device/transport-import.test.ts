import { expect, it } from 'vitest'
import { importTransportFixture } from './transport-import.test-support.ts'

it('serializes import acknowledgments and waits for native flush while settings and heartbeats stay independent', async () => {
  const test = await importTransportFixture()
  try {
    test.receive({
      type: 'settings.operation',
      operationId: 'native-before',
      operation: { action: 'read' },
    })
    expect(test.wire.bufferedAmount).toBeGreaterThan(800_000)
    for (let index = 0; index < 4; index++) {
      test.queue('exists', true)
      test.queue('scan', [
        {
          localWorkspaceId: 'local-one',
          name: 'x'.repeat(650_000),
          repository: 'firna/repository',
          branch: 'feature',
          sessionCount: 1,
          uploadBytes: 0,
        },
      ])
      test.receive({
        type: 'import.operation',
        operationId: `scan-${index}`,
        orgId: 'org-one',
        operation: { action: 'scan' },
      })
    }
    await test.settle()
    expect(test.wire.types()).toEqual(['settings.result'])
    test.receive({ type: 'import.cancel', operationId: 'scan-0' })
    test.receive({ type: 'import.cancel', operationId: 'scan-3' })
    await test.settle()
    test.advance(10_000)
    expect(test.wire.types()).toEqual(['settings.result', 'device.ping'])
    test.wire.flush()
    expect(test.wire.imports()).toHaveLength(0)
    test.wire.flush()
    await test.settle()
    expect(
      test.wire
        .imports()
        .map((frame) => [frame.operationId, frame.sequence, frame.event.kind]),
    ).toEqual([['scan-1', 0, 'scan']])
    test.receive({
      type: 'settings.operation',
      operationId: 'native-during',
      operation: { action: 'read' },
    })
    expect(test.wire.types()).toHaveLength(3)
    test.wire.flush()
    expect(test.wire.types().at(-1)).toBe('settings.result')
    test.wire.flush()
    await test.settle()
    // A flushed frame still owns its import turn until its matching ACK.
    expect(test.wire.imports()).toHaveLength(1)
    test.receive({
      type: 'import.ack',
      operationId: 'scan-1',
      sequence: 0,
      result: { kind: 'accepted' },
    })
    await test.settle()
    expect(
      test.wire
        .imports()
        .map((frame) => [frame.operationId, frame.sequence, frame.event.kind]),
    ).toEqual([
      ['scan-1', 0, 'scan'],
      ['scan-2', 0, 'scan'],
    ])
    test.wire.flush()
    test.receive({
      type: 'import.ack',
      operationId: 'scan-2',
      sequence: 0,
      result: { kind: 'accepted' },
    })
    await test.settle()
    expect(test.wire.imports().at(-1)).toMatchObject({
      operationId: 'scan-1',
      sequence: 1,
      event: { kind: 'done' },
    })
    test.wire.flush()
    test.receive({
      type: 'import.ack',
      operationId: 'scan-1',
      sequence: 1,
      result: { kind: 'accepted' },
    })
    await test.settle()
    expect(test.wire.imports().at(-1)).toMatchObject({
      operationId: 'scan-2',
      sequence: 1,
      event: { kind: 'done' },
    })
    test.wire.flush()
    test.receive({
      type: 'import.ack',
      operationId: 'scan-2',
      sequence: 1,
      result: { kind: 'accepted' },
    })
    await test.settle()
    expect(test.wire.terminate).toHaveBeenCalledTimes(0)
    expect(test.warn).toHaveBeenCalledTimes(0)
    expect(test.wire.bufferedAmount).toBe(0)
  } finally {
    test.dispose()
  }
})
