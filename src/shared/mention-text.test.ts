import { describe, expect, test } from 'vitest'
import { mentionAt, mentionParts, mentionText } from './mention-text'

describe('the text of a mention', () => {
  test('a mention is @ and a path at the start or after a space, and a folder path ends with /', () => {
    expect(
      mentionParts('Move @src/app.ts into @src/lib/ now\n@README.md'),
    ).toEqual([
      { kind: 'text', text: 'Move ' },
      {
        kind: 'mention',
        source: '@src/app.ts',
        path: 'src/app.ts',
        folder: false,
      },
      { kind: 'text', text: ' into ' },
      { kind: 'mention', source: '@src/lib/', path: 'src/lib', folder: true },
      { kind: 'text', text: ' now\n' },
      {
        kind: 'mention',
        source: '@README.md',
        path: 'README.md',
        folder: false,
      },
    ])
  })

  test('a path with a space goes in double quotes, and the quotes stay in the mention', () => {
    expect(mentionParts('See @"docs/My notes.md" first')).toEqual([
      { kind: 'text', text: 'See ' },
      {
        kind: 'mention',
        source: '@"docs/My notes.md"',
        path: 'docs/My notes.md',
        folder: false,
      },
      { kind: 'text', text: ' first' },
    ])
  })

  test('an @ inside a word, alone, before an absolute path, or before an open quote starts no mention', () => {
    const texts = ['cal@example.com', 'a @ b', '@/etc/hosts', '@"open quote']
    expect(texts.map((text) => mentionParts(text))).toEqual(
      texts.map((text) => [{ kind: 'text', text }]),
    )
  })

  test('the mention of an entry quotes a path with a space and ends a folder with /', () => {
    expect([
      mentionText('src/app.ts', false),
      mentionText('src/lib', true),
      mentionText('docs/My notes.md', false),
      mentionText('My folder', true),
    ]).toEqual([
      '@src/app.ts',
      '@src/lib/',
      '@"docs/My notes.md"',
      '@"My folder/"',
    ])
  })

  test('each written mention reads back as the same path and kind', () => {
    const entries = [
      { path: 'src/app.ts', folder: false },
      { path: 'docs/My notes.md', folder: false },
      { path: 'My folder', folder: true },
    ]
    expect(
      entries.map(({ path, folder }) => {
        const found = mentionAt(mentionText(path, folder), 0)
        return { path: found?.path, folder: found?.folder }
      }),
    ).toEqual(entries)
  })
})
