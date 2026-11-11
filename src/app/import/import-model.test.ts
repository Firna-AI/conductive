import { describe, expect, test } from 'vitest'
import type { ImportPublicEvent } from '../../shared/conductor-import-operation'
import type { DevicePairing } from '../../shared/device'
import { operationFetch } from '../../test-support/fake-import-operations'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { ConductorImport } from './import-model'
import type { ImportRow } from './import-uploads'

const pairing: DevicePairing = { deviceId: 'mac-1', connectionId: 'link-1' }

function row(id: string, state: ImportRow['state'] = 'available'): ImportRow {
  const base = {
    localWorkspaceId: id,
    name: `Workspace ${id}`,
    repository: 'acme/storefront',
    branch: `calummoore/${id}`,
    sessionCount: 3,
    uploadBytes: 5_000_000,
  }
  return state === 'unfinished'
    ? {
        ...base,
        state,
        reservationId: `reservation-${id}`,
        storedBytes: 1_000,
        expiresAt: FAKE_TIME,
      }
    : state === 'imported'
      ? { ...base, state, workspaceId: `workspace-${id}` }
      : { ...base, state }
}

function setup(answer: Parameters<typeof operationFetch>[0]) {
  const operations = operationFetch(answer)
  const imported: string[] = []
  const model = new ConductorImport(FAKE_IDS.org, {
    fetch: operations.fetch,
    pairing: async () => pairing,
    imported: (workspaceId) => imported.push(workspaceId),
  })
  return { model, requests: operations.requests, imported }
}

const progress = (id: string, storedBytes: number): ImportPublicEvent => ({
  kind: 'progress',
  reservation: {
    id: `reservation-${id}`,
    localWorkspaceId: id,
    createdAt: FAKE_TIME,
    expiresAt: FAKE_TIME + 86_400_000,
    storedBytes,
    workspaceId: null,
  },
  inFlightBytes: 2_000,
})

describe('the scan of Conductor on this Mac', () => {
  test('collects each page of rows until done, with the pairing of this window', async () => {
    const { model, requests } = setup(() => [
      { kind: 'scan', rows: [row('a')] },
      { kind: 'scan', rows: [row('b', 'imported')] },
      { kind: 'done' },
    ])
    await model.scan()
    expect(model.state.get().scan).toEqual({
      kind: 'ready',
      rows: [row('a'), row('b', 'imported')],
    })
    expect(requests).toEqual([{ ...pairing, action: 'scan' }])
  })

  test('an empty list can be done alone', async () => {
    const { model } = setup(() => [{ kind: 'done' }])
    await model.scan()
    expect(model.state.get().scan).toEqual({ kind: 'ready', rows: [] })
  })

  test('a refused consent shows the question again on Ask again, as a new scan', async () => {
    const { model, requests } = setup(() => [
      { kind: 'failed', code: 'consent_required' },
    ])
    await model.scan()
    expect(model.state.get().scan).toEqual({ kind: 'denied' })
    await model.scan()
    expect(requests.map((request) => request.action)).toEqual(['scan', 'scan'])
  })
})

describe('the upload of a selected workspace', () => {
  test('collects the result pages after complete until done, with verified bytes apart from bytes on the way', async () => {
    const { model, requests, imported } = setup((request) =>
      request.action === 'scan'
        ? [
            { kind: 'scan', rows: [row('a'), row('b', 'unavailable')] },
            { kind: 'done' },
          ]
        : [
            progress('a', 3_000_000),
            { kind: 'complete', localWorkspaceId: 'a', workspaceId: 'made-a' },
            {
              kind: 'result.files',
              localWorkspaceId: 'a',
              files: [{ path: 'data/big.bin', sizeBytes: 200_000_000 }],
            },
            {
              kind: 'result.sessions',
              localWorkspaceId: 'a',
              sessions: [{ title: 'Lost session' }],
            },
            { kind: 'done' },
          ],
    )
    await model.scan()
    model.selectAll(true)
    expect(model.state.get().selected).toEqual(new Set(['a']))
    await model.importSelected()
    expect(requests.at(-1)).toEqual({
      ...pairing,
      action: 'upload',
      localWorkspaceId: 'a',
    })
    expect(imported).toEqual(['made-a'])
    expect(model.state.get().uploads).toMatchObject([
      {
        state: 'ended',
        storedBytes: 3_000_000,
        inFlightBytes: 0,
        workspaceId: 'made-a',
        files: [{ path: 'data/big.bin', sizeBytes: 200_000_000 }],
        sessions: [{ title: 'Lost session' }],
        failure: null,
      },
    ])
  })

  test('a connection that ends after complete, before done, leaves the upload to Try again', async () => {
    const { model } = setup((request) =>
      request.action === 'scan'
        ? [{ kind: 'scan', rows: [row('a')] }, { kind: 'done' }]
        : [
            progress('a', 3_000_000),
            { kind: 'complete', localWorkspaceId: 'a', workspaceId: 'made-a' },
          ],
    )
    await model.scan()
    model.toggle('a')
    await model.importSelected()
    expect(model.state.get().uploads).toMatchObject([
      {
        state: 'failed',
        workspaceId: 'made-a',
        failure: 'The connection to this Mac ended. Try again.',
      },
    ])
  })

  test('Try again of a stopped upload names its reservation', async () => {
    const { model, requests } = setup((request) =>
      request.action === 'scan'
        ? [{ kind: 'scan', rows: [row('a')] }, { kind: 'done' }]
        : request.action === 'upload'
          ? [progress('a', 1_000), { kind: 'failed', code: 'upload_failed' }]
          : [
              {
                kind: 'complete',
                localWorkspaceId: 'a',
                workspaceId: 'made-a',
              },
              { kind: 'done' },
            ],
    )
    await model.scan()
    model.toggle('a')
    await model.importSelected()
    expect(model.state.get().uploads).toMatchObject([
      { state: 'failed', reservationId: 'reservation-a' },
    ])
    await model.retry('a')
    expect(requests.at(-1)).toEqual({
      ...pairing,
      action: 'retry',
      localWorkspaceId: 'a',
      reservationId: 'reservation-a',
    })
    expect(model.state.get().uploads).toMatchObject([
      { state: 'ended', workspaceId: 'made-a' },
    ])
  })
})
