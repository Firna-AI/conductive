import { recordProviderSwitch } from '../operator/switch-write-data'
import { readSwitchRecord } from '../operator/switch-data'
import { readOrgSwitchContext } from '../operator/switch-context-data'
import { setupBackendTests } from './backend-test-hooks'
import type { backendFixture } from './backend-test-support'
import {
  seedSecondaryOrgImage,
  SECONDARY_IMAGE_ACCOUNT,
} from './org-image-account-test-support'

export { SECONDARY_IMAGE_ACCOUNT }
export type SwitchFixture = Awaited<ReturnType<typeof backendFixture>>

export function setupSwitchTests() {
  const fixtureForTest = setupBackendTests()
  return async () => {
    const fixture = fixtureForTest()
    await seedSecondaryOrgImage(fixture)
    return fixture
  }
}

export async function requestSwitch(
  fixture: SwitchFixture,
  endRunningJob = false,
) {
  const { env, dependencies } = fixture.images
  const context = await readOrgSwitchContext(env.DB, fixture.org.id)
  const id = await recordProviderSwitch(env.DB, {
    id: dependencies.randomToken(),
    orgId: fixture.org.id,
    toAccount: SECONDARY_IMAGE_ACCOUNT,
    operatorId: fixture.user.id,
    requestedAt: dependencies.now(),
    endRunningJob,
    runningJobId: context.runningJob?.id ?? null,
    waitReason: context.waitReason,
  })
  if (!id) throw new Error('Switch was not recorded')
  return {
    id,
    read: () => readSwitchRecord(env.DB, fixture.org.id, id),
  }
}
