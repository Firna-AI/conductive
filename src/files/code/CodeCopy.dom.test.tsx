// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiffView } from '../diff/DiffView'
import { CodeView } from './CodeView'
import {
  copy,
  lineNode,
  mountBox,
  row,
  selectAll,
  selectRanges,
  span,
} from './code-box-test-kit'

afterEach(() => {
  vi.restoreAllMocks()
})

/** Mounts a code view of `text`, and finds its box. */
async function codeBox(text: string) {
  return mountBox(<CodeView name="a.txt" text={text} />)
}

describe('CodeBox copy', () => {
  it('copies the text that the view shows, after select all', async () => {
    const texts = ['one\n\ntwo\n\n', 'one\r\ntwo', '\n']
    const copies = []
    for (const text of texts) {
      const { box, outside } = await codeBox(text)
      selectAll(box, outside, { metaKey: true })
      copies.push(copy(box))
    }
    expect(copies).toEqual([
      { prevented: true, text: 'one\n\ntwo\n\n' },
      { prevented: true, text: 'one\ntwo' },
      { prevented: true, text: '\n' },
    ])
  })

  it('copies the selected part of each line, with its empty lines', async () => {
    const { box } = await codeBox('one\n\ntwo\nthree\n')
    selectRanges([span([lineNode(box, 1), 1], [lineNode(box, 3), 2])])
    expect(copy(box)).toEqual({ prevented: true, text: 'ne\n\ntw' })
  })

  it('joins the ranges of a drag that the line numbers split', async () => {
    const { box } = await codeBox('one\n\ntwo\nthree\n')
    // Firefox ends a range before each line number, and starts the next
    // range after it.
    selectRanges([
      span([lineNode(box, 1), 1], [row(box, 2), 0]),
      span([row(box, 2), 1], [row(box, 3), 0]),
      span([row(box, 3), 1], [lineNode(box, 3), 2]),
    ])
    expect(copy(box)).toEqual({ prevented: true, text: 'ne\n\ntw' })
  })

  it('leaves the copy to the browser at a caret or out of the box', async () => {
    const { box, outside } = await codeBox('one\ntwo')
    const outsideText = outside.firstChild
    if (!outsideText) throw new Error('No page text')
    selectRanges([span([lineNode(box, 1), 1], [lineNode(box, 1), 1])])
    const caret = copy(box)
    selectRanges([
      span([lineNode(box, 1), 0], [lineNode(box, 1), 3]),
      span([outsideText, 0], [outsideText, 4]),
    ])
    const reaching = copy(box)
    expect({ caret, reaching }).toEqual({
      caret: { prevented: false, text: '' },
      reaching: { prevented: false, text: '' },
    })
  })

  it('reads only the ends of a selection, whatever the length of the file', async () => {
    const calls = []
    for (const count of [10, 400]) {
      const text = Array.from({ length: count }, (_, i) => `line ${i}`)
      const { box } = await codeBox(text.join('\n'))
      selectRanges([span([lineNode(box, 5), 0], [lineNode(box, 5), 4])])
      const methods = ['comparePoint', 'intersectsNode'] as const
      const spies = methods.map((name) => vi.spyOn(Range.prototype, name))
      const copied = copy(box)
      calls.push({ copied, calls: spies.map((spy) => spy.mock.calls.length) })
      vi.restoreAllMocks()
    }
    expect(calls[0]).toEqual({
      copied: { prevented: true, text: 'line' },
      calls: calls[1]?.calls,
    })
    expect(calls[1]?.copied.text).toBe('line')
  })

  it('leaves the copy of a diff to the browser', async () => {
    const { box, outside } = await mountBox(
      <DiffView
        name="a.ts"
        newContent={null}
        oldContent={null}
        rows={[{ kind: 'added', text: 'one', oldLine: null, newLine: 1 }]}
      />,
    )
    selectAll(box, outside, { metaKey: true })
    expect(copy(box).prevented).toBe(false)
  })
})
