import type { AgentChoice } from '../../../shared/generated/AgentChoice'
import type { SkillLists } from '../../../shared/generated/SkillLists'
import { skillContentPath, type SkillIdentity } from '../../../shared/skills'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import { nextEnvelope } from '../../../test-support/recorded-repairs'

// The helpers of the tests that open skill tabs in the workspace screen.

const { org, workspace: id } = FAKE_IDS

export const plans: SkillIdentity = { agent: 'claude', name: 'plans' }

/** The description of `plans` in the skills report. */
export const plansDescription = 'Use before you write or change a plan file.'

/** The skills of the tests: `plans` of Claude, and `review` of both agents. */
export const skillLists: SkillLists = {
  claude: [
    { name: 'plans', description: plansDescription },
    { name: 'review', description: 'Review the diff of the branch.' },
  ],
  codex: [{ name: 'review', description: 'Review the diff with Codex.' }],
}

/** The `SKILL.md` of `plans`: its front matter, then its Markdown body. */
export const plansText = [
  '---',
  'name: plans',
  `description: ${plansDescription}`,
  '---',
  '',
  '# Plans',
  '',
  'Write each decision with its options.',
  '',
].join('\n')

/** The Markdown body of `plans`, after its front matter. */
export const plansBody = '\n# Plans\n\nWrite each decision with its options.\n'

/**
 * Puts a skills report into the stored history of the fake workspace, and
 * a sent message of the member with `text`, to the agent of `choice`.
 */
export function serveSkillChat(
  server: FakeApiServer,
  text = 'Use /plans now',
  choice?: AgentChoice,
): void {
  const { message } = workspaceFixtures()
  const { events } = server
  events.emit(
    nextEnvelope(
      events,
      { type: 'skills.updated', skills: skillLists },
      FAKE_TIME,
    ),
  )
  events.emit(
    nextEnvelope(
      events,
      {
        type: 'message.accepted',
        message: {
          ...message,
          id: 'skill-ask',
          text,
          choice: choice ?? message.choice,
        },
      },
      FAKE_TIME,
    ),
  )
}

/**
 * One reply of the read of a skill, as the Worker sends it, or a broken
 * one: a read whose fetch fails, as when the connection drops, a 200 whose
 * body fails before its end, as when the connection drops after the
 * status, and a 200 whose body is not JSON.
 */
export type SkillReply =
  | { status: number; body: unknown }
  | 'lost connection'
  | 'lost body'
  | 'not JSON'

/** A reply with the text of a skill. */
export const textReply = (text: string): SkillReply => ({
  status: 200,
  body: { text },
})

/** A reply with the error of `code`, as the Worker sends it. */
export const errorReply = (status: number, code: string): SkillReply => ({
  status,
  body: { error: { code, message: 'The skill did not open.' } },
})

/** The response of `reply`, or the failure of its fetch. */
function respond(reply: SkillReply): Promise<Response> {
  switch (reply) {
    case 'lost connection':
      return Promise.reject(new TypeError('Failed to fetch'))
    case 'lost body': {
      const body = new ReadableStream<Uint8Array>({
        start: (controller) => controller.error(new TypeError('network error')),
      })
      return Promise.resolve(new Response(body, { status: 200 }))
    }
    case 'not JSON':
      return Promise.resolve(new Response('{"text": "---', { status: 200 }))
    default:
      return Promise.resolve(
        Response.json(reply.body, { status: reply.status }),
      )
  }
}

/**
 * Answers each read of `skill` with the next reply of `replies`, and with
 * the last one after them. It gives the number of reads so far.
 */
export function serveSkillReads(
  server: FakeApiServer,
  skill: SkillIdentity,
  replies: readonly SkillReply[],
): () => number {
  let reads = 0
  server.handle('GET', skillContentPath(org, id, skill), () => {
    const reply = replies[Math.min(reads, replies.length - 1)]
    reads += 1
    return respond(reply)
  })
  return () => reads
}
