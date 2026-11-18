import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
import { attachmentPath } from '../../src/shared/attachment-paths'
import { shellQuote } from '../lifecycle/commands'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { attachmentDownloadCommand } from './attachment-download-command'
import { FILE_BYTES } from './attachment.test-support'

const execute = promisify(execFile)

it('lets a second command for the same file wait for the first, then leave the delivered file alone', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'attachment-overlap-'))
  const tools = await mkdtemp(join(tmpdir(), 'attachment-overlap-curl-'))
  const relativePath = await attachmentPath({ id: 'overlap', name: 'a.dat' })
  const target = join(directory, relativePath)
  const payload = join(tools, 'payload')
  const calls = join(tools, 'calls')
  const entered = join(tools, 'entered')
  const release = join(tools, 'release')
  const curl = join(tools, 'curl')
  await writeFile(payload, FILE_BYTES)
  await execute('/usr/bin/mkfifo', [entered, release])
  // The first download writes part of its file, then waits for the test.
  await writeFile(
    curl,
    [
      '#!/bin/sh',
      'while [ "$#" -gt 0 ]; do',
      '  if [ "$1" = --output ]; then shift; output="$1"; fi',
      '  shift',
      'done',
      `echo call >> ${shellQuote(calls)}`,
      `if [ "$(/usr/bin/wc -l < ${shellQuote(calls)})" -eq 1 ]; then`,
      '  printf partial > "$output"',
      `  echo in > ${shellQuote(entered)}`,
      `  read _ < ${shellQuote(release)}`,
      'fi',
      `/bin/cp ${shellQuote(payload)} "$output"`,
    ].join('\n'),
    { mode: 0o700 },
  )
  const run = () =>
    execute(
      '/bin/sh',
      [
        '-c',
        attachmentDownloadCommand({
          directory,
          relativePath,
          sizeBytes: FILE_BYTES.byteLength,
          origin: 'https://api.conductive.test',
          token: 'download-token',
        }).replace('/usr/bin/curl', curl),
      ],
      { env: isolatedProcessEnvironment({}) },
    )
  try {
    const first = run()
    await readFile(entered)
    const second = run()
    await writeFile(release, 'go\n')
    await expect(first).resolves.toMatchObject({ stdout: '', stderr: '' })
    await expect(second).resolves.toMatchObject({ stdout: '', stderr: '' })
    expect(await readFile(calls, 'utf8')).toBe('call\n')
    expect(new Uint8Array(await readFile(target))).toEqual(FILE_BYTES)
    expect(await readdir(join(target, '..'))).toEqual(['a.dat'])
  } finally {
    await rm(directory, { recursive: true, force: true })
    await rm(tools, { recursive: true, force: true })
  }
})
