import { expect, it } from 'vitest'

import { MemoryWorkspaceStorage } from './platform-test-storage'
import { durableStartStorage, readStartLog } from './start-storage'
import type { WorkspaceStartJob } from './start-types'
import { readSavedScript } from './saved-script'

it('masks a secret split between stdout and stderr in the released start log', async () => {
  const env = { BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)) }
  const storage = new MemoryWorkspaceStorage()
  const starts = durableStartStorage(storage, () => 0, env)
  const job: WorkspaceStartJob = {
    workspaceId: 'log-workspace',
    orgId: 'log-org',
    kind: 'resume',
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'log-turn',
    attempt: 'log-attempt',
    phase: 'startup',
    processId: 1,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  await starts.begin(job, 0)
  await starts.secrets(['stored-env-secret'])
  await starts.capture(job, {
    stdout: 'failed stored-',
    stderr: 'secret',
    stdoutNextOffset: 14,
    stderrNextOffset: 6,
  })
  await starts.capture(job, {
    stdout: 'env-',
    stderr: '\n',
    stdoutNextOffset: 18,
    stderrNextOffset: 7,
  })
  expect(JSON.stringify({ log: await readStartLog(storage, env) })).toBe(
    '{"log":"failed [hidden]\\n"}',
  )
})
