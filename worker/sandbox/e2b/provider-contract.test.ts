import { afterAll, beforeAll, describe } from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { registerErrorContract } from '../contract-errors.test-support'
import { registerCommandContract } from '../contract-commands.test-support'
import { registerFileContract } from '../contract-files.test-support'
import { registerPortContract } from '../contract-ports.test-support'
import {
  registerLifecycleContract,
  registerSnapshotContract,
} from '../contract-lifecycle.test-support'
import { createE2bContractFixture } from './contract.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

describe('E2B SandboxProvider contract', () => {
  const createFixture = () => createE2bContractFixture(harness)
  registerLifecycleContract(createFixture)
  registerSnapshotContract(createFixture)
  registerCommandContract(createFixture)
  registerFileContract(createFixture)
  registerPortContract(createFixture)
  registerErrorContract(createFixture)
})
