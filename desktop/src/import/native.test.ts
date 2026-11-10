import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { convertNative } from './native.ts'
import {
  claudeRow,
  codexRow,
  nativeFile,
  withNativeFixture,
} from './native-test-support.ts'

it('converts only the Claude main chain and keeps source bytes unchanged', async () => {
  await withNativeFixture(async (root) => {
    const source = await nativeFile(root, 'claude.jsonl', [
      claudeRow('u1', null, 'user', 'Keep my **format**.\n雪'),
      claudeRow('abandoned', 'u1', 'assistant', 'ABANDONED'),
      claudeRow(
        'thinking',
        'u1',
        'assistant',
        [{ type: 'thinking', thinking: 'THINKING', signature: 'SIGNATURE' }],
        {},
        'logical-answer',
      ),
      claudeRow(
        'text-fragment',
        'u1',
        'assistant',
        [{ type: 'text', text: 'I will inspect it.' }],
        { providerMetadata: 'PROVIDER METADATA' },
        'logical-answer',
      ),
      claudeRow(
        'a1',
        'u1',
        'assistant',
        [
          {
            type: 'tool_use',
            id: 'call1',
            name: 'Read',
            input: { path: 'PRIVATE INPUT' },
          },
        ],
        {},
        'logical-answer',
      ),
      claudeRow('result', 'a1', 'user', [
        {
          type: 'tool_result',
          tool_use_id: 'call1',
          content: 'FULL TOOL OUTPUT',
        },
      ]),
      claudeRow(
        'a2',
        'result',
        'assistant',
        [{ type: 'text', text: 'The answer.' }],
        {
          timestamp: '2026-11-10T11:00:00.000Z',
        },
      ),
      claudeRow('side', 'a2', 'assistant', 'SIDECHAIN', { isSidechain: true }),
      {
        type: 'system',
        subtype: 'compact_boundary',
        uuid: 'compact',
        parentUuid: null,
        compactMetadata: {
          preservedMessages: {
            anchorUuid: 'compact',
            uuids: ['u1', 'a1', 'result', 'a2'],
          },
        },
      },
      claudeRow('a3', 'compact', 'assistant', 'After compact.'),
      {
        type: 'system',
        subtype: 'compact_boundary',
        uuid: 'compact-segment',
        parentUuid: null,
        compactMetadata: {
          preservedSegment: {
            anchorUuid: 'compact-segment',
            headUuid: 'u1',
            tailUuid: 'a3',
          },
        },
      },
      claudeRow('a4', 'compact-segment', 'assistant', 'After segment.'),
      claudeRow('team', 'a4', 'assistant', 'TEAM CHAT', {
        teamName: 'synthetic team',
      }),
      { type: 'summary', summary: 'SUMMARY METADATA', leafUuid: 'a2' },
    ])
    const output = join(root, 'document.md')

    expect(
      await convertNative(
        source.path,
        output,
        'claude',
        new AbortController().signal,
      ),
    ).toEqual({
      restoredBytes: source.decoded.length,
      messageCount: 5,
      occurredAt: 1794214800000,
    })
    expect(await readFile(output, 'utf8')).toBe(
      '# Imported session\n\n## User\n\nKeep my **format**.\n雪\n\n## Assistant\n\nI will inspect it.\n\n- Tool: Read\n\n## Assistant\n\nThe answer.\n\n## Assistant\n\nAfter compact.\n\n## Assistant\n\nAfter segment.\n\n',
    )
    expect(await readFile(source.path)).toEqual(source.original)
    await expect(
      convertNative(
        source.path,
        source.path,
        'claude',
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'EEXIST' })
    expect(await readFile(source.path)).toEqual(source.original)
    expect((await readdir(root)).sort()).toEqual([
      'claude.jsonl',
      'document.md',
    ])
  })
})

it('streams compressed Codex messages and tool steps without event echoes', async () => {
  await withNativeFixture(async (root) => {
    const source = await nativeFile(root, 'codex.jsonl.zst', [
      { type: 'session_meta', payload: { instructions: 'PROVIDER METADATA' } },
      codexRow({
        type: 'message',
        role: 'developer',
        content: [{ type: 'input_text', text: 'DEVELOPER METADATA' }],
      }),
      codexRow(
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'Original message.\n雪' }],
        },
        '2026-11-09T09:00:00.000Z',
      ),
      {
        type: 'event_msg',
        payload: { type: 'user_message', message: 'DUPLICATE USER ECHO' },
      },
      codexRow({
        type: 'reasoning',
        summary: [{ text: 'REASONING' }],
        encrypted_content: 'SIGNATURE',
      }),
      codexRow({
        type: 'function_call',
        name: 'exec_command',
        arguments: 'PRIVATE TOOL INPUT',
      }),
      codexRow({ type: 'function_call_output', output: 'FULL TOOL OUTPUT' }),
      codexRow({
        type: 'custom_tool_call',
        name: 'apply_patch',
        input: 'PRIVATE PATCH',
      }),
      codexRow({
        type: 'custom_tool_call_output',
        output: 'FULL PATCH OUTPUT',
      }),
      codexRow(
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Original answer.' }],
        },
        '2026-11-10T11:00:00.000Z',
      ),
      {
        type: 'event_msg',
        payload: { type: 'agent_message', message: 'DUPLICATE ASSISTANT ECHO' },
      },
    ])
    const output = join(root, 'document.md')

    expect(
      await convertNative(
        source.path,
        output,
        'codex',
        new AbortController().signal,
      ),
    ).toEqual({
      restoredBytes: source.decoded.length,
      messageCount: 2,
      occurredAt: 1794214800000,
    })
    expect(await readFile(output, 'utf8')).toBe(
      '# Imported session\n\n## User\n\nOriginal message.\n雪\n\n- Tool: exec_command\n\n- Tool: apply_patch\n\n## Assistant\n\nOriginal answer.\n\n',
    )
    expect(await readFile(source.path)).toEqual(source.original)
  })
})
