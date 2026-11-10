import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { indexNativeFiles, inspectNative } from './native.ts'
import { withNativeFixture } from './native-test-support.ts'

it('indexes native session IDs without reading histories or following links', async () => {
  await withNativeFixture(async (root) => {
    const claudeId = '11111111-1111-4111-8111-111111111111'
    const codexId = '22222222-2222-4222-8222-222222222222'
    const rollout = `rollout-2026-11-09T09-00-00-${codexId}`
    const claude = join(root, 'claude', 'project', `${claudeId}.jsonl`)
    const codex = join(
      root,
      'codex',
      '2026',
      '11',
      '09',
      `${rollout}.jsonl.zst`,
    )
    const outside = join(root, 'outside')
    await mkdir(join(root, 'claude', 'project'), { recursive: true })
    await mkdir(join(root, 'codex', '2026', '11', '09'), { recursive: true })
    await mkdir(outside)
    await mkdir(join(outside, 'nested'))
    await writeFile(claude, 'not JSON')
    await writeFile(codex, 'not zstd')
    await writeFile(join(outside, 'outside.jsonl'), 'private synthetic text')
    await writeFile(
      join(outside, 'nested', 'outside-child.jsonl'),
      'synthetic text',
    )
    await symlink(outside, join(root, 'claude', 'linked-folder'))
    await symlink(claude, join(root, 'codex', 'linked-file.jsonl'))
    await symlink(outside, join(root, 'linked-root'))
    const signal = new AbortController().signal
    const index = await indexNativeFiles(
      [
        join(root, 'claude'),
        join(root, 'codex'),
        join(root, 'linked-root'),
        join(root, 'linked-root', 'nested'),
        join(root, 'absent'),
      ],
      signal,
    )

    expect([...index.keys()].sort()).toEqual(
      [claudeId, codexId, rollout].sort(),
    )
    expect(index.get(claudeId)).toBe(claude)
    expect(index.get(codexId)).toBe(codex)
    expect(index.get(rollout)).toBe(codex)
    expect(await inspectNative(codex, signal)).toEqual({
      encoding: 'zstd',
      sizeBytes: 8,
    })
    expect(await inspectNative(claude, signal)).toEqual({
      encoding: 'identity',
      sizeBytes: 8,
    })
    expect(await readFile(codex, 'utf8')).toBe('not zstd')
    await expect(
      inspectNative(join(root, 'codex', 'linked-file.jsonl'), signal),
    ).rejects.toThrow('The native history is not a regular file.')
  })
})
