import { describe } from 'vitest'

import { createBoatContractFixture } from './boat-contract.test-support'
import { registerCommandContract } from './contract-commands.test-support'
import { registerErrorContract } from './contract-errors.test-support'
import { registerFileContract } from './contract-files.test-support'
import {
  registerLifecycleContract,
  registerSnapshotContract,
} from './contract-lifecycle.test-support'
import { registerPortContract } from './contract-ports.test-support'

describe('Boat SandboxProvider contract', () => {
  registerLifecycleContract(createBoatContractFixture)
  registerSnapshotContract(createBoatContractFixture)
  registerCommandContract(createBoatContractFixture)
  registerFileContract(createBoatContractFixture)
  registerPortContract(createBoatContractFixture)
  registerErrorContract(createBoatContractFixture)
})
