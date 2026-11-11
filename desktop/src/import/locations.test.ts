import { readFile, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { expect, it } from 'vitest'
import {
  claudeMemory,
  facts,
  packageFixture,
  signal,
} from './package-test-support.ts'
import { runImportJob } from './worker-client.ts'
import { sourceHashes } from '../../tests/import-fixture.ts'

it('resolves trusted parent aliases at job entry and preserves native bytes and sealed retry', async () => {
  const f = await packageFixture()
  try {
    const claude = Buffer.from(claudeMemory())
    const id = '22222222-2222-4222-8222-222222222222'
    const codex = zstdCompressSync(
      Buffer.from(
        JSON.stringify({
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Synthetic Codex' }],
          },
        }) + '\n',
      ),
    )
    const claudePath = await f.native(
      '.claude/projects/example/native-one.jsonl',
      claude,
    )
    const codexPath = await f.native(
      `.codex/sessions/2026/11/11/rollout-2026-11-11T00-00-00-${id}.jsonl.zst`,
      codex,
    )
    f.session('one', 'native-one', 'claude', 'Claude')
    f.session('two', id, 'codex', 'Codex')
    const alias = join(f.root, 'trusted-parent')
    await symlink(f.root, alias)
    const locations = {
      ...f.locations,
      home: join(alias, 'home'),
      userData: join(alias, 'private'),
    }
    const before = await sourceHashes(f.locations.home)
    const prepared = await runImportJob(
      locations,
      {
        action: 'prepare',
        localWorkspaceId: 'local-one',
        scope: 'scope',
        reservationId: 'reservation',
      },
      signal(),
    )
    const built = await runImportJob(
      locations,
      { action: 'build', stageId: prepared.id, facts: facts(), exclusions: [] },
      signal(),
    )
    const stage = await runImportJob(
      locations,
      { action: 'seal', stageId: built.id, prerequisites: [] },
      signal(),
    )
    const entries = await runImportJob(
      locations,
      { action: 'page', stageId: stage.id, offset: 0 },
      signal(),
    )
    const sessions = entries.filter((entry) => entry.kind === 'session')
    expect(sessions.map((entry) => entry.nativePath)).toEqual([
      'native-one.jsonl',
      `sessions/2026/11/11/rollout-2026-11-11T00-00-00-${id}.jsonl`,
    ])
    for (const [index, expected] of [claude, codex].entries()) {
      const session = sessions[index]
      const part = entries.find(
        (entry) =>
          entry.kind === 'part' && entry.objectId === session.memoryObjectId,
      )
      expect(part?.kind).toBe('part')
      if (!part || part.kind !== 'part') throw new Error('Missing native part')
      expect(
        await runImportJob(
          locations,
          { action: 'part', stageId: stage.id, part: part.part },
          signal(),
        ),
      ).toEqual(new Uint8Array(expected))
    }
    expect(
      await runImportJob(
        locations,
        {
          action: 'reuse',
          localWorkspaceId: 'local-one',
          scope: 'scope',
          reservationId: 'reservation',
        },
        signal(),
      ),
    ).toEqual(stage)
    expect(await readFile(claudePath)).toEqual(claude)
    expect(await readFile(codexPath)).toEqual(codex)
    expect(await sourceHashes(f.locations.home)).toEqual(before)
  } finally {
    await f.dispose()
  }
})
