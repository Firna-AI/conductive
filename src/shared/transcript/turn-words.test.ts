import { expect, it } from 'vitest'
import type { AgentChatEvent } from '../generated/AgentChatEvent'
import { emptyTranscript, foldEvent } from './transcript'
import { stoppedNotes } from './turn-words'

const completion: Extract<AgentChatEvent, { type: 'turn.completed' }> = {
  type: 'turn.completed',
  sessionId: 'session',
  turnId: 'turn',
  state: 'stopped',
  durationMs: 1_000,
  files: [
    { path: 'src/first.ts', change: 'modified', added: 1, removed: 0 },
    { path: 'src/second.ts', change: 'modified', added: 2, removed: 1 },
  ],
  omittedFileCount: 0,
  userMessageIds: [],
}

it.each([
  { omitted: 0, note: '2 changed files not listed' },
  { omitted: 3, note: '5 changed files not listed' },
])(
  'counts reported files and $omitted omitted files in a stopped turn',
  ({ omitted, note }) => {
    const transcript = foldEvent(
      emptyTranscript,
      { ...completion, omittedFileCount: omitted },
      1_000,
    )

    expect(transcript.items.map((item) => item.kind)).toEqual(['stopped'])
    expect(stoppedNotes(transcript, completion.turnId)).toEqual([note])
  },
)
