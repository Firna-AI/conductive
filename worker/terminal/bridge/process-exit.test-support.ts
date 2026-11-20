import { spawnSync } from 'node:child_process'

import { vi } from 'vitest'

export async function waitForProcessExit(
  pids: readonly string[],
): Promise<void> {
  if (pids.length === 0) return
  await vi.waitFor(
    () => {
      const result = spawnSync('ps', ['-p', pids.join(','), '-o', 'stat='], {
        encoding: 'utf8',
      })
      if (result.error) throw result.error
      if (result.status !== 0 && result.status !== 1)
        throw new Error('The fixture could not read process state.')
      // A zombie has exited and can no longer write files.
      const running = result.stdout
        .split('\n')
        .map((state) => state.trim())
        .some((state) => state !== '' && !state.startsWith('Z'))
      if (running)
        throw new Error('The tmux server or its shells have not exited.')
    },
    { timeout: 10_000, interval: 20 },
  )
}
