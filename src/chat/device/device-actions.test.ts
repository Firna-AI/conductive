import { describe, expect, it, vi } from 'vitest'
import { deviceApprovalPath, deviceCommandsPath } from '../../shared/device'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
  fakeMacRequest,
} from '../../test-support/fixtures/devices'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatFor } from '../state/test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const commands = deviceCommandsPath(org, ws)
const request = fakeMacRequest()
const approval = deviceApprovalPath(org, ws, request.requestId)
const { workspace } = workspaceFixtures('input').detail

describe('Mac commands in the chat controller', () => {
  it('sends the answer with the pairing of this window, and keeps it until the request changes', async () => {
    const chat = chatFor({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
    })
    await chat.controller.start()
    const devices = () => chat.controller.getSnapshot().devices
    await chat.controller.answerCommand(request.requestId, 'always-allow')
    await chat.controller.answerCommand(request.requestId, 'deny')
    expect(await chat.bodies('POST', approval)).toEqual([
      { ...FAKE_PAIRING, action: 'always-allow' },
    ])
    expect(devices().answers).toEqual({ [request.requestId]: 'always-allow' })

    chat.server.json('GET', commands, {
      requests: [{ ...request, state: 'running' }],
    })
    chat.emit({ type: 'workspace.updated', workspace })
    await vi.waitFor(() => expect(devices().requests[0]?.state).toBe('running'))
    expect(devices().answers).toEqual({})
  })

  it('clears an answer that the Mac did not get and names the cause, but not for a request that no longer waits', async () => {
    const chat = chatFor({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
    })
    await chat.controller.start()
    const snapshot = () => chat.controller.getSnapshot()
    const refused = {
      code: 'device_forbidden',
      message: 'Open this request on the connected Mac.',
    }
    chat.server.json('POST', approval, { error: refused }, 403)
    await chat.controller.answerCommand(request.requestId, 'allow')
    expect(snapshot().devices.answers).toEqual({})
    expect(snapshot().notice).toEqual({
      sessionId: FAKE_IDS.session,
      title: 'The Mac did not get the answer',
      message: 'Open this request on the connected Mac.',
    })

    chat.controller.dismissNotice()
    const answered = {
      code: 'device_request_not_pending',
      message: 'The Mac request no longer waits for approval.',
    }
    chat.server.json('POST', approval, { error: answered }, 409)
    await chat.controller.answerCommand(request.requestId, 'allow')
    expect(snapshot().devices.answers).toEqual({})
    expect(snapshot().notice).toBeNull()
  })

  it('keeps the records of the newer read when the reply of an older read comes last', async () => {
    let holding = false
    const chat = chatFor({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
      hold: (held) =>
        holding &&
        held.method === 'GET' &&
        new URL(held.url).pathname === commands,
    })
    await chat.controller.start()
    holding = true
    const older = chat.controller.loadDevices()
    const newer = chat.controller.loadDevices()
    await vi.waitFor(() => expect(chat.held).toHaveLength(2))
    chat.server.json('GET', commands, {
      requests: [{ ...request, state: 'denied' }],
    })
    chat.held[1]()
    await newer
    chat.server.json('GET', commands, { requests: [request] })
    chat.held[0]()
    await older
    const shown = chat.controller.getSnapshot().devices.requests
    expect(shown.map((item) => item.state)).toEqual(['denied'])
  })
})
