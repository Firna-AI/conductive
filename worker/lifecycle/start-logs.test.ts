import { expect, it } from 'vitest'

import { nativeLifecycleStorage } from './native-storage.test-support'
import { TEST_TIME } from '../test-support/harness'
import { durableStartStorage } from './start-storage'
import { readStartLog } from './start-log-storage'
import type { WorkspaceStartJob } from './start-types'
import { readSavedScript } from './saved-script'
import { MaskedStartLog } from './masked-start-log'

it('hides every machine token without a saved secrets list', () => {
  const token = `cndm1.${'a'.repeat(64)}.${'S'.repeat(43)}`
  expect(MaskedStartLog.mask(`first ${token} second ${token}`, []).text).toBe(
    'first [hidden] second [hidden]',
  )
})

it('masks split and short secrets without changing an inserted start-log marker', async () => {
  const env = { BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)) }
  const { storage } = await nativeLifecycleStorage()
  const starts = durableStartStorage(storage, () => TEST_TIME, env)
  const job: WorkspaceStartJob = {
    providerAccount: 'boat',
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
  await starts.secrets(['stored-env-secret', 'h'])
  await starts.capture(job, {
    stdout: 'failed stored-',
    stderr: 'secret',
    stdoutNextOffset: 14,
    stderrNextOffset: 6,
  })
  await starts.capture(job, {
    stdout: 'env-',
    stderr: '\nh',
    stdoutNextOffset: 18,
    stderrNextOffset: 8,
  })
  expect(JSON.stringify({ log: await readStartLog(storage, env) })).toBe(
    '{"log":"failed [hidden]\\n[hidden]"}',
  )
})
