import { expect, test } from 'vitest'
import { agentBlocks } from '../chat/markdown/agent-blocks'
import { previewDocument } from '../files/markdown/preview-blocks'

test('shows deep quote text once before later blocks despite earlier reference definitions', () => {
  const definitions = Array.from(
    { length: 80 },
    (_, index) => `[ref${index}]: /doc`,
  ).join('\n')
  const source = definitions + '\n\n' + '> '.repeat(80) + 'leaf\n\nafter'
  for (const blocks of [agentBlocks(source), previewDocument(source).blocks]) {
    expect(JSON.stringify(blocks).match(/leaf|after/g)).toEqual([
      'leaf',
      'after',
    ])
  }
})

test('keeps a heading and paragraph after a forty-level list as their own blocks', () => {
  const source = '- '.repeat(40) + 'leaf\n\n# Heading\n\nafter'
  const chat = agentBlocks(source)
  const preview = previewDocument(source).blocks
  expect(chat.map((block) => block.kind)).toEqual(['ul', 'heading', 'p'])
  expect(preview.map((block) => block.kind)).toEqual([
    'list',
    'heading',
    'paragraph',
  ])
  for (const blocks of [chat, preview]) {
    expect(JSON.stringify(blocks).match(/leaf|Heading|after/g)).toEqual([
      'leaf',
      'Heading',
      'after',
    ])
  }
})
