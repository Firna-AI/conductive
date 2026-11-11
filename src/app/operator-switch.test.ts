import { describe, expect, test } from 'vitest'
import {
  operatorWaitlistSwitchPath,
  type OperatorWaitlistSwitch,
} from '../shared/operator-waitlist'
import { startedApp } from '../shell/test-render'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { sampleOperator } from '../test-support/fixtures/operator'
import { serveOperator } from '../test-support/operator'
import { OperatorSwitch } from './operator-switch'
import { flushMicrotasks, HeldRequests } from './test-kit'

describe('OperatorSwitch', () => {
  test('keeps the reply of Turn off the waitlist when a read that started before it answers after it', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const off: OperatorWaitlistSwitch = {
      waitlistOn: false,
      updatedAt: FAKE_TIME,
      operator: sampleOperator,
      waiting: 38,
    }
    server.json('DELETE', operatorWaitlistSwitchPath(), off)
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    const waitlist = new OperatorSwitch(app)
    held.holdAnswer('GET', operatorWaitlistSwitchPath())
    waitlist.state.watch()
    await waitlist.turnOff()
    held.release('GET', operatorWaitlistSwitchPath())
    await flushMicrotasks()
    expect({
      shown: waitlist.state.value.get(),
      reading: waitlist.state.reading.get(),
    }).toEqual({
      shown: { state: 'ready', value: off },
      reading: false,
    })
  })
})
