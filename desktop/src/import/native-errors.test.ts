import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { convertNative } from './native.ts'
import {
  claudeRow,
  codexRow,
  nativeFile,
  rawNativeFile,
  withNativeFixture,
} from './native-test-support.ts'

it('rejects damaged native input and removes partial documents', async () => {
  await withNativeFixture(async (root) => {
    const valid = JSON.stringify(
      codexRow({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Synthetic member text.' }],
      }),
    )
    const cases = [
      {
        name: 'broken.jsonl',
        bytes: Buffer.from(`${valid}\nnot-json`),
        message: 'The native history has invalid JSON at line 2.',
      },
      {
        name: 'broken-utf8.jsonl',
        bytes: Buffer.from([0xff]),
        message: 'The native history has invalid UTF-8.',
      },
      {
        name: 'broken.jsonl.zst',
        bytes: Buffer.from('not zstd'),
        message: 'The compressed native history could not be read.',
      },
    ]
    for (const input of cases) {
      const source = await rawNativeFile(root, input.name, input.bytes)
      await expect(
        convertNative(
          source.path,
          join(root, 'document.md'),
          'codex',
          new AbortController().signal,
        ),
      ).rejects.toThrow(input.message)
      expect(await readFile(source.path)).toEqual(input.bytes)
    }
    expect((await readdir(root)).sort()).toEqual([
      'broken-utf8.jsonl',
      'broken.jsonl',
      'broken.jsonl.zst',
    ])
  })
})

it('cancels active native conversion and removes temporary output', async () => {
  const agents: ('claude' | 'codex')[] = ['claude', 'codex']
  for (const agent of agents) {
    await withNativeFixture(async (root) => {
      const source = await nativeFile(
        root,
        'cancel.jsonl',
        Array.from({ length: 80 }, (_, index) =>
          agent === 'claude'
            ? claudeRow(
                `u${index}`,
                index === 0 ? null : `u${index - 1}`,
                'user',
                'Synthetic member text.',
              )
            : codexRow({
                type: 'message',
                role: 'user',
                content: [
                  { type: 'input_text', text: 'Synthetic member text.' },
                ],
              }),
        ),
      )
      const controller = new AbortController()
      const originalCheck = controller.signal.throwIfAborted.bind(
        controller.signal,
      )
      let checks = 0
      const check = vi
        .spyOn(controller.signal, 'throwIfAborted')
        .mockImplementation(() => {
          checks += 1
          if (checks === 30) controller.abort()
          originalCheck()
        })
      try {
        await expect(
          convertNative(
            source.path,
            join(root, 'document.md'),
            agent,
            controller.signal,
          ),
        ).rejects.toMatchObject({ name: 'AbortError' })
        expect(await readFile(source.path)).toEqual(source.original)
        expect(await readdir(root)).toEqual(['cancel.jsonl'])
      } finally {
        check.mockRestore()
      }
    })
  }
})
