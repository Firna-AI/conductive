import { expect } from 'vitest'

import type { backendFixture } from './backend-test-support'
import { readSavedScript } from './saved-script'
import type { WorkspaceStartJob } from './start-types'

export async function expectSettled<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<{ settled: false }>((resolve) => {
    timer = setTimeout(() => resolve({ settled: false }), 10_000)
  })
  try {
    const result = await Promise.race([
      work.then((value) => ({ settled: true as const, value })),
      deadline,
    ])
    expect(result.settled).toBe(true)
    if (!result.settled) throw new Error('The operation did not settle.')
    return result.value
  } finally {
    clearTimeout(timer)
  }
}

export function outsideResumeJob(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  workspaceId: string,
  sandboxId: string,
): WorkspaceStartJob {
  return {
    kind: 'resume',
    phase: 'machine',
    orgId: fixture.org.id,
    workspaceId,
    providerAccount: 'boat',
    allocatedSandboxId: sandboxId,
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'outside-resume-turn',
    attempt: 'outside-resume-attempt',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
}
