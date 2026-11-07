import { afterEach, expect, it } from 'vitest'

import { deviceApprovalPath, deviceCommandPath } from '../../src/shared/device'
import { deviceObject, readDeviceRecord } from '../../src/shared/device-read'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import { command, connected, ref, sendFrame } from './requests.test-support'

let fixture: DeviceFixture
afterEach(async () => {
  await fixture?.dispose()
})

it('uses hashed URL keys for dot retry IDs while device frames keep their exact IDs', async () => {
  fixture = await deviceFixture()
  const mac = await connected(fixture)
  for (const [id, key] of [
    ['.', 'zbTuKuppzGqDMxu-ltwsqpopnSEynvsDNvwCqC4YOag'],
    ['..', 'XsH35wDzfD0LKYHQSFX8NLlKqhVFewXKVxgXRC0ij4E'],
  ]) {
    const request = await command(fixture, mac, id)
    expect(request.requestKey).toBe(key)
    const retry = await fixture.machine(fixture.input(id))
    expect(retry.status).toBe(202)
    expect(readDeviceRecord(deviceObject(await retry.json()).request)).toEqual(
      request,
    )
    expect(
      (await fixture.machine({ ...fixture.input(id), command: 'changed' }))
        .status,
    ).toBe(409)
    expect((await fixture.readCommand(key)).status).toBe(202)
    const path = deviceCommandPath('org', WID, key)
    const read = await fixture.app(path)
    expect(read.status).toBe(200)
    expect(readDeviceRecord(deviceObject(await read.json()).request)).toEqual(
      request,
    )
    const answer = await fixture.app(
      deviceApprovalPath('org', WID, key),
      { ...mac.device, action: 'deny' },
      fixture.senderToken,
      true,
    )
    expect(answer.status).toBe(202)
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.approval',
      ...ref(id),
      action: 'deny',
    })
    await sendFrame(mac, { type: 'command.denied', ...ref(id) })
    const done = await fixture.readCommand(key)
    expect(done.status).toBe(200)
    expect(await done.json()).toMatchObject({
      request: { requestId: id, requestKey: key, state: 'denied' },
    })
  }
  expect((await fixture.readCommand('not-a-record-key')).status).toBe(404)
})
