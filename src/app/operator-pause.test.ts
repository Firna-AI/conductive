import { describe, expect, test } from 'vitest'
import {
  operatorSignupPausePath,
  type OperatorSignupPause,
} from '../shared/operator-waitlist'
import { startedApp } from '../shell/test-render'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { sampleOperator } from '../test-support/fixtures/operator'
import { serveOperator } from '../test-support/operator'
import { OperatorPause } from './operator-pause'
import { flushMicrotasks, HeldRequests } from './test-kit'

describe('OperatorPause', () => {
  test('keeps the reply of Pause sign-ups when a read that started before it answers after it', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const paused: OperatorSignupPause = {
      paused: true,
      updatedAt: FAKE_TIME,
      operator: sampleOperator,
    }
    server.json('POST', operatorSignupPausePath(), paused)
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    const pause = new OperatorPause(app)
    held.holdAnswer('GET', operatorSignupPausePath())
    pause.state.watch()
    await pause.pause()
    held.release('GET', operatorSignupPausePath())
    await flushMicrotasks()
    expect({
      shown: pause.state.value.get(),
      reading: pause.state.reading.get(),
    }).toEqual({
      shown: { state: 'ready', value: paused },
      reading: false,
    })
  })
})
