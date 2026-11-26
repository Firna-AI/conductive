// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import codeStyles from '../../files/code/code.module.css'
import {
  byRole,
  byToast,
  queryByRole,
  shownToasts,
} from '../../test-support/dom-queries'
import {
  MOUNTED_TEST_TIMEOUT,
  mount,
  press,
  waitFor,
} from '../../test-support/mount'
import { explainableSelection, messageAttributes } from '../explain/selection'
import type { CopyServices } from '../transcript-copy'
import { AgentText } from './AgentText'
import { CodeCopyProvider, useCodeCopyAction } from './code-copy'
import { ChatToasts } from './TranscriptCopy'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The text of each element under `root` with the class. */
function textsOf(root: ParentNode | undefined, className: string | undefined) {
  return Array.from(
    root?.querySelectorAll(`.${className}`) ?? [],
    (element) => element.textContent ?? '',
  )
}

/** The words of code under `root` in the colour of a keyword. */
function keywordsOf(root: ParentNode | undefined): string[] {
  return textsOf(root, codeStyles.keyword)
}

/** An answer with a code block whose text keeps a tab and a blank line. */
const answer = [
  'Run this:',
  '',
  '```ts',
  'function f() {',
  '\treturn 1',
  '',
  '}',
  '```',
].join('\n')

const code = 'function f() {\n\treturn 1\n\n}'

/** A clipboard that keeps or refuses each text. */
function clipboard(refuse = false) {
  const copied: string[] = []
  const services: CopyServices = {
    copy: async (text) => {
      if (refuse) throw new Error('The clipboard refused the text.')
      copied.push(await text)
    },
    now: () => 0,
    delay: () => () => undefined,
  }
  return { copied, services }
}

/** The copy of code blocks of a chat, as `WorkspaceChat` gives it. */
function CodeCopy(props: { services: CopyServices; children: ReactNode }) {
  const copy = useCodeCopyAction(props.services)
  return <CodeCopyProvider value={copy}>{props.children}</CodeCopyProvider>
}

async function mountAnswer(services: CopyServices) {
  await mount(
    <ChatToasts>
      <CodeCopy services={services}>
        <AgentText id="agent:1" text={answer} />
      </CodeCopy>
    </ChatToasts>,
  )
}

describe('the Copy button of a code block', () => {
  it('copies the code of a coloured block exactly as the agent wrote it', async () => {
    const { copied, services } = clipboard()
    await mountAnswer(services)
    // The fence label `ts` colours the block.
    expect(keywordsOf(document)).toEqual(['function', 'return'])
    await press(byRole('button', 'Copy code'))
    await waitFor(() => shownToasts().length > 0, 'the toast of the copy')
    byToast('Code copied')
    expect(copied).toEqual([code])
  })

  it('says when the clipboard refuses the code', async () => {
    const { copied, services } = clipboard(true)
    await mountAnswer(services)
    await press(byRole('button', 'Copy code'))
    await waitFor(() => shownToasts().length > 0, 'the toast of the copy')
    byToast("The code didn't copy. Try again.")
    expect(copied).toEqual([])
  })

  it('keeps the button out of the text of the code', async () => {
    const { services } = clipboard()
    await mountAnswer(services)
    expect(document.querySelector('pre')?.textContent).toBe(code)
  })

  it('shows no button outside a chat that copies', async () => {
    await mount(<AgentText id="agent:1" text={answer} />)
    expect(document.querySelector('pre')?.textContent).toBe(code)
    expect(queryByRole('button', 'Copy code')).toBeNull()
  })
})

describe('the colours of a code block', () => {
  it('shows a block with the fence label of a language in the colours of a file tab, and a block without a label as plain text', async () => {
    const rust = 'fn main() {\n\tlet greeting = "hi";\n\n}'
    await mount(
      <AgentText
        id="agent:1"
        text={['```rust', rust, '```', '', '```', 'cargo run', '```'].join(
          '\n',
        )}
      />,
    )
    const [coloured, plain] = document.querySelectorAll('pre')
    expect({
      keywords: keywordsOf(coloured),
      strings: textsOf(coloured, codeStyles.string),
      coloured: coloured?.textContent,
      plain: { elements: plain?.children.length, text: plain?.textContent },
    }).toEqual({
      keywords: ['fn', 'let'],
      strings: ['"hi"'],
      coloured: rust,
      plain: { elements: 0, text: 'cargo run' },
    })
  })

  it('gives Explain the text of a coloured block as the agent wrote it', async () => {
    const explained = {
      [messageAttributes.chat]: 'chat',
      [messageAttributes.message]: 'answer-1',
      [messageAttributes.done]: '',
    }
    await mount(
      <div {...explained}>
        <AgentText id="agent:1" text={answer} />
      </div>,
    )
    const pre = document.querySelector('pre')
    if (!pre) throw new Error('The answer has no code block.')
    const range = document.createRange()
    range.selectNodeContents(pre)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)
    const selection = explainableSelection(document.getSelection(), 'chat')
    expect({
      keywords: keywordsOf(pre),
      quote: selection?.quote,
      before: selection?.before,
    }).toEqual({
      keywords: ['function', 'return'],
      quote: code,
      before: 'Run this:\n',
    })
  })
})
