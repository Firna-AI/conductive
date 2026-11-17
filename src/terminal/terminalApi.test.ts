import { describe, expect, it } from 'vitest'
import { terminalPaths, type TerminalEntry } from '../shared/terminal'
import { closeTerminal, loadTerminal, openTerminal } from './terminalApi'
import type { ToolRequests } from './tool-parts/workspace'

const org = 'acme'
const workspace = 'checkout-autocomplete'

function entry(id: string, number: number): TerminalEntry {
  return {
    id,
    number,
    socketPath: terminalPaths.terminalSocket(org, workspace, id),
  }
}

const first = entry('workspace', 1)
const second = entry('2'.repeat(32), 2)

/** The requests of a tool whose fetch answers each request with `body`. */
function answering(body: unknown): ToolRequests {
  return {
    orgId: org,
    workspaceId: workspace,
    fetch: async () => Response.json(body),
  }
}

const ready = {
  state: 'ready',
  socketPath: terminalPaths.socket(org, workspace),
  protocol: 'tty',
  several: true,
}

describe('the replies of the terminal routes', () => {
  it('give the event number of their list, and none for an older server', async () => {
    const signal = new AbortController().signal
    const results = await Promise.all([
      loadTerminal(
        answering({ ...ready, terminals: [first], eventNumber: 3 }),
        signal,
      ),
      openTerminal(
        answering({
          terminal: second,
          terminals: [first, second],
          eventNumber: 4,
        }),
      ),
      closeTerminal(
        answering({ terminals: [first], eventNumber: 5 }),
        second.id,
      ),
      loadTerminal(answering({ ...ready, terminals: [first] }), signal),
    ])

    expect(
      results.map((result) =>
        result.ok ? result.value.eventNumber : result.error.code,
      ),
    ).toEqual([3, 4, 5, undefined])
  })
})
