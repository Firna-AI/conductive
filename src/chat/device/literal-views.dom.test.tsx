// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { deviceCommandsPath } from '../../shared/device'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  fakeLiteralCommands,
  fakeMacRequest,
} from '../../test-support/fixtures/devices'
import { renderChat } from '../components/render-kit'
import { CommandCard } from './CommandCard'

const [comment, spoof] = fakeLiteralCommands
const folder = '~/code/store\u00A0front'

/** Each element of the markup that keeps its whitespace, by its exact text. */
function literalsOf(markup: string): Map<string, HTMLElement> {
  document.body.innerHTML = markup
  const found = new Map<string, HTMLElement>()
  for (const element of document.querySelectorAll<HTMLElement>('code, span')) {
    if (element.style.whiteSpace === 'pre-wrap') {
      found.set(element.textContent ?? '', element)
    }
  }
  return found
}

/** The code points that the marks of one literal element name. */
function marksOf(found: Map<string, HTMLElement>, text: string): string[] {
  const element = found.get(text)
  if (!element) throw new Error(`No literal element shows ${text}`)
  return Array.from(element.querySelectorAll('[data-literal-code]'), (mark) =>
    mark.getAttribute('data-literal-code'),
  ).filter((code) => code !== null)
}

describe('literal commands in the chat', () => {
  it('shows each command and folder literally in the waiting message, its Details, and its card', async () => {
    const waiting = fakeMacRequest({ command: comment, folder })
    const chat = await renderChat({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
      setup: (server) =>
        server.json(
          'GET',
          deviceCommandsPath(FAKE_IDS.org, FAKE_IDS.workspace),
          { requests: [waiting] },
        ),
    })
    const pending = literalsOf(chat.markup())
    expect([...pending.keys()]).toEqual([`$ ${comment}`, folder])
    expect(marksOf(pending, folder)).toEqual(['U+00A0'])

    const done = fakeMacRequest({
      command: spoof,
      folder,
      state: 'completed',
      startedAt: FAKE_TIME + 6_000,
      updatedAt: FAKE_TIME + 7_000,
      result: {
        stdout: 'hi\u00A0#\nRAN',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        truncated: false,
      },
    })
    const card = literalsOf(
      renderToStaticMarkup(<CommandCard request={done} viewerId={null} />),
    )
    expect([...card.keys()]).toEqual([`$ ${spoof}`, folder])
    expect(marksOf(card, `$ ${spoof}`)).toEqual(['U+00A0'])
  })
})
