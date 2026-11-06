import { expect, it } from 'vitest'

import { errorResponse, HttpError } from '../http'
import {
  commandBody,
  countedReply,
  paddedBody,
  sandboxBody,
} from './transport.test-support'

it('accepts a normal response at exactly 1 MiB of received bytes', async () => {
  const reply = countedReply(paddedBody(sandboxBody(), 1_048_576))
  await expect(reply.client.get('bx_one')).resolves.toEqual({
    id: 'bx_one',
    state: 'ready',
  })
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 1_048_576,
    cancelled: 0,
  })
})

it('cancels a normal response on the first byte above 1 MiB with a safe error', async () => {
  const reply = countedReply(paddedBody(sandboxBody(), 1_048_576), {
    overflow: true,
  })
  await expect(reply.client.get('bx_one')).rejects.toMatchObject({
    status: 502,
    code: 'sandbox_response_too_large',
    message: 'The cloud computer response is too large.',
  })
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 1_048_577,
    cancelled: 1,
  })
})

it('accepts two full 8 MiB command streams at exactly 18 MiB of JSON', async () => {
  const reply = countedReply(paddedBody(commandBody(), 18_874_368))
  const result = reply.client.runCommand('bx_one', 'npm test')
  await expect(result).resolves.toMatchObject({ exitCode: 0, timedOut: false })
  const { stdout, stderr } = await result
  expect(stdout.length).toBe(8_388_608)
  expect(stderr.length).toBe(8_388_608)
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 18_874_368,
    cancelled: 0,
  })
})

it('cancels command JSON above 18 MiB and exposes the exact safe command error', async () => {
  const reply = countedReply(paddedBody(commandBody(), 18_874_368), {
    overflow: true,
  })
  const error: unknown = await reply.client
    .runCommand('bx_one', 'npm test')
    .catch((error: unknown) => error)
  expect(error).toBeInstanceOf(HttpError)
  const response = errorResponse(error)
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'command_output_too_large',
      message: 'The command output is too large.',
    },
  })
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 18_874_369,
    cancelled: 1,
  })
})
