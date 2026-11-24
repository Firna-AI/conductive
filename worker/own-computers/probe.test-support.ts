import { record, string } from '../chat/inputs'
import type { AppEnv } from '../env'
import { ownComputerClient } from './client'

export const OWN_COMPUTER_TEST_PATH = '/__test/own-computer/get'
export const OWN_COMPUTER_APP_TEST_HEADER = 'X-Own-Computer-App-Test'

export async function getComputerContainer(request: Request, env: AppEnv) {
  const input = record(await request.json())
  const client = ownComputerClient(env, {
    orgId: string(input.orgId),
    computerId: string(input.computerId),
  })
  return Response.json(await client.get(string(input.container)))
}
