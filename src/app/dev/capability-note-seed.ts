import type { CapabilityChange } from '../../ui/components/chat/capabilityChangeCopy'
import { autocompleteGrants } from '../../../docs/mockups/src/fixtures/secretRequests'
import {
  figmaToken,
  replicaUrl,
  vercelToken,
} from '../../../docs/mockups/src/fixtures/secrets'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { FakeWorkspaceEvents } from '../../test-support/fake-events'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import { senderOf } from './secret-store'

/**
 * The notes of a change of the capabilities that `capabilities=` puts into
 * the session of `checkout-autocomplete`, as the pages of
 * `app/capabilities/changed` in the mockups draw them. `changed` has the
 * pre-approval of VERCEL_TOKEN by Priya, `removed` has two writes of two
 * members, and `several` has one write with three changes.
 */
export const CAPABILITY_SCENARIOS = ['changed', 'removed', 'several'] as const

export type CapabilityScenario = (typeof CAPABILITY_SCENARIOS)[number]

const [, priya, jonas] = fakeUsers.map(senderOf)

/** The member and the changes of each write of a state, in order. */
function writesOf(
  scenario: CapabilityScenario,
): [MessageSender, CapabilityChange[]][] {
  switch (scenario) {
    case 'changed':
      return [[priya, [{ kind: 'pre-approved', names: [vercelToken.name] }]]]
    case 'removed':
      return [
        [jonas, [{ kind: 'pre-approval-removed', names: [figmaToken.name] }]],
        [
          priya,
          [
            {
              kind: 'value-removed',
              names: [autocompleteGrants.values[0].name],
            },
          ],
        ],
      ]
    case 'several':
      return [
        [
          priya,
          [
            { kind: 'pre-approved', names: [vercelToken.name] },
            { kind: 'pre-approval-removed', names: [figmaToken.name] },
            { kind: 'session-approval-removed', names: [replicaUrl.name] },
          ],
        ],
      ]
  }
}

/**
 * Puts the notes of a state of `capabilities=` into the history of the fake,
 * each one second after the newest event before it. So they follow the
 * recorded chat: in its running turn with `conversation=running`, and after
 * its end otherwise. The notes change no capability of the workspace.
 */
export function seedCapabilityNotes(
  events: FakeWorkspaceEvents,
  scenario: CapabilityScenario | null,
): void {
  if (scenario === null) return
  writesOf(scenario).forEach(([member, changes], index) => {
    const history = events.history(0, FAKE_IDS.workspace)
    const newest = history.events.reduce(
      (at, envelope) => Math.max(at, envelope.occurredAt),
      FAKE_TIME,
    )
    events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: history.throughEventNumber + 1,
      occurredAt: newest + 1_000,
      event: {
        type: 'capabilities.changed',
        sessionId: FAKE_IDS.session,
        noteId: `dev-${scenario}-${index + 1}`,
        member,
        changes,
      },
    })
  })
}
