// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { mount } from '../../test-support/mount'
import styles from './code.module.css'
import { FenceText } from './CodeText'

/** The `<pre>` of a code block with a fence label, as an answer draws it. */
async function codeBlock(text: string, label: string | null) {
  const view = await mount(
    <pre>
      <FenceText label={label} text={text} />
    </pre>,
  )
  const pre = view.container.querySelector('pre')
  if (!pre) throw new Error('The code block has no pre.')
  return pre
}

/** The text of each element of the block with the class. */
function textsOf(pre: HTMLElement, className: string | undefined): string[] {
  return Array.from(
    pre.querySelectorAll(`.${className}`),
    (element) => element.textContent ?? '',
  )
}

/** A Rust block with a tab, a string, a comment, a number, and a blank line. */
const rust =
  'fn main() {\n\tlet greeting = "hi"; // say it\n\n\tlet count = 1;\n}'

it('colours each line of a labelled block with the spans of a file tab, and keeps its text, tabs, and line feeds as written', async () => {
  const pre = await codeBlock(rust, 'rust')
  expect({
    text: pre.textContent,
    keywords: textsOf(pre, styles.keyword),
    strings: textsOf(pre, styles.string),
    comments: textsOf(pre, styles.comment),
    numbers: textsOf(pre, styles['number-token']),
    // The colours are inline spans, so no line is an element of its own.
    blocks: pre.querySelectorAll('div, p, br').length,
  }).toEqual({
    text: rust,
    keywords: ['fn', 'let', 'let'],
    strings: ['"hi"'],
    comments: ['// say it'],
    numbers: ['1'],
    blocks: 0,
  })
})

it('shows the plain text of a block without a label, with a text label, or with an unknown label', async () => {
  const shown: Record<string, unknown> = {}
  for (const label of [null, 'text', 'unknown']) {
    const pre = await codeBlock(rust, label)
    shown[String(label)] = {
      elements: pre.children.length,
      text: pre.textContent,
    }
  }
  const plain = { elements: 0, text: rust }
  expect(shown).toEqual({ null: plain, text: plain, unknown: plain })
})
