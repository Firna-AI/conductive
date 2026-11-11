import { expect, it } from 'vitest'

import { transcriptWindow } from './transcript-window'

it('returns newest whole lines by default and pages forward from an earlier line', () => {
  const markdown = 'oldest\nmiddle\nnewest\n'
  expect(transcriptWindow(markdown, {}, 18)).toEqual({
    markdown: 'middle\nnewest\n',
    startLine: 2,
    endLine: 3,
    totalLines: 3,
    startOffset: 0,
    endOffset: 7,
    next: null,
  })
  expect(transcriptWindow(markdown, { startLine: 1 }, 18)).toEqual({
    markdown: 'oldest\nmiddle\n',
    startLine: 1,
    endLine: 2,
    totalLines: 3,
    startOffset: 0,
    endOffset: 7,
    next: { line: 3, offset: 0 },
  })
  expect(transcriptWindow(markdown, { startLine: 99 }, 18).markdown).toBe(
    'newest\n',
  )
})

it('recovers every character of an oversized line within the escaped UTF-8 budget', () => {
  const markdown = 'α😀\\"abc\nnext\n'
  let page = transcriptWindow(markdown, { startLine: 1 }, 12)
  expect(page).toEqual({
    markdown: 'α😀\\"',
    startLine: 1,
    endLine: 1,
    totalLines: 2,
    startOffset: 0,
    endOffset: 5,
    next: { line: 1, offset: 5 },
  })
  let restored = page.markdown
  while (page.next !== null) {
    page = transcriptWindow(
      markdown,
      {
        startLine: page.next.line,
        startOffset: page.next.offset,
      },
      12,
    )
    expect(page.markdown.length).toBeGreaterThan(0)
    expect(
      new TextEncoder().encode(JSON.stringify(page.markdown)).length,
    ).toBeLessThanOrEqual(12)
    restored += page.markdown
  }
  expect(restored).toBe(markdown)
  expect(transcriptWindow('aa😀😀😀😀😀😀\n', {}, 12)).toMatchObject({
    markdown: '😀😀\n',
    startLine: 1,
    startOffset: 10,
    endOffset: 15,
  })
})
