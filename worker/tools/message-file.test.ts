import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterAll, beforeAll, expect, it } from 'vitest'

import { record } from '../../tools/input'
import { createHarness, type TestHarness } from '../test-support/harness'
import { adapterFixture } from './adapter-test-support'
import { imageTestProcess } from './image-test-process'
import { installedHandlerTools } from './message-file.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('preserves file and raw stdin message text through installed CLI commands', async () => {
  const fixture = await adapterFixture(harness)
  const installed = await installedHandlerTools(fixture)
  try {
    const message = '  Review café 🧭\r\nSecond line\r\n\n'
    const file = join(installed.directory, 'message with spaces.txt')
    await writeFile(file, message, 'utf8')
    for (const command of [
      {
        args: ['workspaces', 'create', '--repository', 'repo-a'],
        field: 'firstMessage',
      },
      {
        args: ['sessions', 'create', '--workspace', 'teammate-workspace'],
        field: 'firstMessage',
      },
      {
        args: ['sessions', 'send', '--session', 'session / one'],
        field: 'text',
      },
    ]) {
      for (const source of [file, '-']) {
        const result = await imageTestProcess(
          installed.executable,
          [...command.args, '--message-file', source],
          source === '-' ? message : '',
          installed.environment,
        )
        expect(
          result,
          `${command.args.join(' ')} from ${source}`,
        ).toMatchObject({ exitCode: 0, stderr: '' })
        const request = fixture.requests.at(-1)
        expect(request).toBeInstanceOf(Request)
        if (!request) throw new Error('Missing message request')
        expect(record(await request.json())[command.field]).toBe(message)
      }
    }
    const sent = fixture.requests.length
    for (const invalid of [
      {
        args: ['--message-file', join(installed.directory, 'missing.txt')],
        stderr:
          'The message file could not be read. Check its path and try again.\n',
      },
      {
        args: ['--message', 'Inline text', '--message-file', file],
        stderr: 'Use --message or --message-file for one message.\n',
      },
    ]) {
      const result = await imageTestProcess(
        installed.executable,
        ['sessions', 'send', '--session', 'session / one', ...invalid.args],
        '',
        installed.environment,
      )
      expect(result).toMatchObject({
        exitCode: 1,
        stdout: '',
        stderr: invalid.stderr,
      })
    }
    expect(fixture.requests).toHaveLength(sent)
  } finally {
    await installed.dispose()
  }
})
