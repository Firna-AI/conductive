// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
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
import type { CopyServices } from '../transcript-copy'
import { AgentText } from './AgentText'
import { CodeCopyProvider, useCodeCopyAction } from './code-copy'
import { ChatToasts } from './TranscriptCopy'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

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
        <AgentText text={answer} />
      </CodeCopy>
    </ChatToasts>,
  )
}

describe('the Copy button of a code block', () => {
  it('copies the code exactly as the agent wrote it', async () => {
    const { copied, services } = clipboard()
    await mountAnswer(services)
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
    await mount(<AgentText text={answer} />)
    expect(document.querySelector('pre')?.textContent).toBe(code)
    expect(queryByRole('button', 'Copy code')).toBeNull()
  })
})
