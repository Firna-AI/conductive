/**
 * The chat of the page of code blocks in replies, in Checkout address
 * autocomplete. The made-up sites, such as the places API, use the
 * reserved top-level domain `.example`.
 */

import type { TextBlock } from '../../../../src/chat/markdown/agent-blocks'
import { codeBlock, p } from './agentText'
import type { ChatItem } from './conversations'

/**
 * The example of a session of the guide of the places API, which the agent
 * copies with the fence label `rust`. It has no lifetime and no character
 * literal, because the colours of a file tab read a `'` as the start of a
 * string.
 */
export const sessionExample = `use std::time::Duration;

/// Each lookup waits this long after the last key press.
pub const WAIT: Duration = Duration::from_millis(250);

/// One session of lookups, until the person picks a place.
pub struct Session {
    pub token: String,
}

impl Session {
    pub fn lookup(&self, query: &str) -> String {
        format!("/v1/lookup?session={}&q={}", self.token, query)
    }
}`

/** The requests of one session, which the agent copies without a label. */
const sessionRequests = `GET /v1/lookup?session=8f3a2c&q=221B
GET /v1/lookup?session=8f3a2c&q=221B%20Baker
GET /v1/lookup?session=8f3a2c&q=221B%20Baker%20St`

/**
 * The file name that stands for the fence label of each labelled code
 * block of the chat fixtures, by the text of the block, such as
 * `example.rs` for a block after ```rust. The language of the name gives
 * the colours of a file tab. `TextBlock` keeps no fence label, so the
 * drawing of the mockups finds the name here. A block that this table
 * does not name has no label.
 */
export const codeBlockNames: ReadonlyMap<string, string> = new Map([
  [sessionExample, 'example.rs'],
])

/**
 * The answer about the sessions of the places API: the Rust example of the
 * guide in a labelled block, and the requests of a session in a block
 * without a label.
 */
const sessionAnswer: readonly TextBlock[] = [
  p(
    'The guide keeps the token in a session, from the first key press until the person picks a place. Its example is in Rust:',
  ),
  codeBlock(sessionExample),
  p(
    'Each lookup of the session sends the same token, so the API bills the session once:',
  ),
  codeBlock(sessionRequests),
  p('Our proxy sends the token in the same way, so checkout needs no change.'),
]

/** The chats of the page of code blocks in replies. */
export const codeBlockConversations = {
  'code-blocks': [
    {
      kind: 'user',
      id: 'ask-session',
      text: 'How does the places guide keep one session token across lookups?',
    },
    {
      kind: 'tool',
      id: 'read-sessions',
      tool: 'run',
      target: 'curl -s https://docs.places.example/v1/sessions',
      status: 'done',
    },
    { kind: 'agent', id: 'session-answer', blocks: sessionAnswer },
    { kind: 'turn-end', id: 'turn-end', duration: '14s', files: [] },
  ],
} as const satisfies Record<string, readonly ChatItem[]>
