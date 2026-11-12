import { expect, it } from 'vitest'
import { foldMarkdown } from './markdown-items'

it('keeps fold skill names as plain Markdown text between the counts and omitted output', () => {
  expect(
    foldMarkdown(
      [
        {
          id: 'skill',
          kind: 'other',
          target: 'plugin:*plans*\nnext',
          skills: ['plugin:*plans*\nnext'],
          detail: null,
          omittedDetailBytes: 1024,
          state: 'done',
        },
      ],
      7,
    ),
  ).toBe(
    '_1 tool call, 7 messages · Skill: plugin:\\*plans\\* next · 1 KB of output left out_',
  )
})
