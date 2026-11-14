import { execFile } from 'node:child_process'
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
import {
  attachmentPath,
  ATTACHMENTS_DIRECTORY,
} from '../../src/shared/attachment-paths'
import { shellQuote } from '../lifecycle/commands'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { attachmentDownloadCommand } from './attachment-download-command'
import { FILE_BYTES } from './attachment.test-support'

const execute = promisify(execFile)

it('downloads atomically, rejects the wrong byte count, and clears old temporary files after a restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), "attachment's-repository-"))
  const relativePath = await attachmentPath({
    id: 'shell-file',
    name: 'a file.dat',
  })
  const target = join(directory, relativePath)
  const parent = target.slice(0, target.lastIndexOf('/'))
  const payload = join(directory, 'payload')
  const argumentsPath = join(directory, 'arguments')
  const curlDirectory = await mkdtemp(join(tmpdir(), 'attachment-curl-'))
  const curl = join(curlDirectory, 'curl')
  await writeFile(payload, FILE_BYTES)
  await writeFile(
    curl,
    [
      '#!/bin/sh',
      `printf '%s\\n' "$@" > ${shellQuote(argumentsPath)}`,
      'while [ "$#" -gt 0 ]; do',
      '  if [ "$1" = --output ]; then shift; output="$1"; fi',
      '  shift',
      'done',
      `test -z "\${UNTRUSTED_SECRET:-}"`,
      `/bin/cp ${shellQuote(payload)} "$output"`,
    ].join('\n'),
    { mode: 0o700 },
  )
  const command = (sizeBytes: number) =>
    attachmentDownloadCommand({
      directory,
      relativePath,
      sizeBytes,
      origin: 'https://api.conductive.test',
      token: 'private-download-token',
    }).replace('/usr/bin/curl', curl)
  const run = (script: string) =>
    execute('/bin/sh', ['-c', script], {
      env: isolatedProcessEnvironment({
        UNTRUSTED_SECRET: 'must-not-reach-curl',
      }),
    })
  try {
    await mkdir(parent, { recursive: true })
    await writeFile(`${target}.download-abandoned`, 'partial')
    await expect(run(command(7))).rejects.toMatchObject({
      code: 1,
      stdout: '',
      stderr: '',
    })
    await expect(readFile(target)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readdir(parent)).toEqual([])
    const first = command(6)
    const restarted = command(6)
    expect(restarted).not.toBe(first)
    expect(await run(restarted)).toMatchObject({ stdout: '', stderr: '' })
    expect(new Uint8Array(await readFile(target))).toEqual(FILE_BYTES)
    expect(
      await readFile(
        join(directory, ATTACHMENTS_DIRECTORY, '.gitignore'),
        'utf8',
      ),
    ).toBe('*')
    expect((await readFile(argumentsPath, 'utf8')).split('\n')).toEqual([
      '--disable',
      '--proto',
      '=https',
      '--tlsv1.2',
      '--max-redirs',
      '0',
      '--connect-timeout',
      '10',
      '--speed-limit',
      '1024',
      '--speed-time',
      '60',
      '--max-time',
      '3600',
      '--silent',
      '--fail',
      '--request',
      'POST',
      '--header',
      'Authorization: Bearer private-download-token',
      '--output',
      expect.stringMatching(/\.download-[a-f0-9-]+$/),
      'https://api.conductive.test/v1/internal/attachments/download',
      '',
    ])
    await rm(target)
    await mkdir(target)
    await expect(run(command(6))).rejects.toMatchObject({ code: 1 })
    expect(await readdir(target)).toEqual([])
    expect(await readdir(parent)).toEqual(['a-file.dat'])
    await rm(target, { recursive: true })
    const linkedDirectory = join(directory, 'linked-folder')
    await mkdir(linkedDirectory)
    await symlink(linkedDirectory, target, 'dir')
    expect(await run(command(6))).toMatchObject({ stdout: '', stderr: '' })
    expect((await lstat(target)).isSymbolicLink()).toBe(false)
    expect(new Uint8Array(await readFile(target))).toEqual(FILE_BYTES)
    expect(await readdir(linkedDirectory)).toEqual([])
    await writeFile(payload, 'short')
    await expect(run(command(6))).rejects.toMatchObject({ code: 1 })
    expect(new Uint8Array(await readFile(target))).toEqual(FILE_BYTES)
    expect(await readdir(parent)).toEqual(['a-file.dat'])
  } finally {
    await rm(directory, { recursive: true, force: true })
    await rm(curlDirectory, { recursive: true, force: true })
  }
})
