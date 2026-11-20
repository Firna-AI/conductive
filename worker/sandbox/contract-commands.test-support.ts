import { describe, expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

export function registerCommandContract(
  createFixture: ProviderContractFactory,
): void {
  describe('commands', () => {
    it('returns waiting command results', async () => {
      const fixture = createFixture()
      await fixture.given({
        kind: 'command',
        value: { exitCode: 0, stdout: 'done\n', stderr: '', timedOut: false },
      })
      expect(
        await fixture.provider.runCommand('sandbox-one', 'npm test'),
      ).toEqual({ exitCode: 0, stdout: 'done\n', stderr: '', timedOut: false })
    })

    it('starts a detached build and continues logs from provider byte offsets', async () => {
      const fixture = createFixture()
      await fixture.given({
        kind: 'started_command',
        value: { processId: 1234 },
      })
      expect(
        await fixture.provider.startCommand('sandbox-one', 'npm run build'),
      ).toEqual({ processId: 1234 })
      await fixture.given({
        kind: 'command_status',
        value: {
          processId: 1234,
          state: 'running',
          running: true,
          exitCode: null,
          timedOut: null,
          stdout: 'é\n',
          stderr: 'warning\n',
          stdoutOffset: 0,
          stderrOffset: 0,
          stdoutNextOffset: 3,
          stderrNextOffset: 8,
          more: true,
        },
      })
      const first = await fixture.provider.getCommandStatus(
        'sandbox-one',
        1234,
        { stdoutOffset: 0, stderrOffset: 0 },
      )
      expect(first).toEqual({
        processId: 1234,
        state: 'running',
        running: true,
        exitCode: null,
        timedOut: null,
        stdout: 'é\n',
        stderr: 'warning\n',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 3,
        stderrNextOffset: 8,
        more: true,
      })
      await fixture.given({
        kind: 'command_status',
        value: {
          processId: 1234,
          state: 'exited',
          running: false,
          exitCode: 137,
          timedOut: true,
          stdout: 'done\n',
          stderr: '',
          stdoutOffset: 3,
          stderrOffset: 8,
          stdoutNextOffset: 8,
          stderrNextOffset: 8,
          more: false,
        },
      })
      expect(
        await fixture.provider.getCommandStatus('sandbox-one', 1234, {
          stdoutOffset: first.stdoutNextOffset,
          stderrOffset: first.stderrNextOffset,
        }),
      ).toEqual({
        processId: 1234,
        state: 'exited',
        running: false,
        exitCode: 137,
        timedOut: true,
        stdout: 'done\n',
        stderr: '',
        stdoutOffset: 3,
        stderrOffset: 8,
        stdoutNextOffset: 8,
        stderrNextOffset: 8,
        more: false,
      })
    })

    it('preserves a lost process and reset offsets after an agent restart', async () => {
      const fixture = createFixture()
      await fixture.given({
        kind: 'command_status',
        value: {
          processId: 1234,
          state: 'lost',
          running: false,
          exitCode: null,
          timedOut: null,
          stdout: 'new log\n',
          stderr: '',
          stdoutOffset: 0,
          stderrOffset: 0,
          stdoutNextOffset: 8,
          stderrNextOffset: 0,
          more: false,
        },
      })
      expect(
        await fixture.provider.getCommandStatus('sandbox-one', 1234, {
          stdoutOffset: 100,
          stderrOffset: 5,
        }),
      ).toEqual({
        processId: 1234,
        state: 'lost',
        running: false,
        exitCode: null,
        timedOut: null,
        stdout: 'new log\n',
        stderr: '',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 8,
        stderrNextOffset: 0,
        more: false,
      })
    })
  })
}
