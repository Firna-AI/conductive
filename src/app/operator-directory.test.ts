import { describe, expect, test } from 'vitest'
import { operatorOrgsPath, type OperatorOrgsResponse } from '../shared/operator'
import { FakeApiServer } from '../test-support/fake-api'
import { orgRow } from '../test-support/fixtures/operator'
import { serveOperator } from '../test-support/operator'
import { startedApp } from '../shell/test-render'
import { readOrgsPage } from './api/read-operator'
import { OperatorDirectory } from './operator-directory'
import { flushMicrotasks, HeldRequests } from './test-kit'

describe('OperatorDirectory', () => {
  test('keeps the rows of the newer search when the answer of an older search comes last', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const rows = fixtures.orgs.map((org) => orgRow(org))
    const named = (part: string): OperatorOrgsResponse => {
      const orgs = rows.filter((row) => row.name.toLowerCase().includes(part))
      return { orgs, total: orgs.length, nextCursor: null }
    }
    server.json('GET', operatorOrgsPath({ q: 'a' }), named('a'))
    server.json('GET', operatorOrgsPath({ q: 'hex' }), named('hex'))
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    const directory = new OperatorDirectory(app, operatorOrgsPath, readOrgsPage)
    held.holdAnswer('GET', operatorOrgsPath())
    const close = directory.watch('a')
    close()
    directory.watch('hex')
    await flushMicrotasks()
    const newer = directory.state.get().result
    held.release('GET', operatorOrgsPath())
    await flushMicrotasks()
    const { result, reading } = directory.state.get()
    expect({
      newer: newer?.rows.map((row) => row.name),
      shown: result?.rows.map((row) => row.name),
      search: result?.search,
      reading,
    }).toEqual({
      newer: ['Hexwave'],
      shown: ['Hexwave'],
      search: 'hex',
      reading: null,
    })
  })
})
