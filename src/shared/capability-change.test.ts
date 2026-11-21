import { expect, it } from 'vitest'

import {
  capabilityChangeNoteWords,
  capabilityChangeText,
} from './capability-change'

const member = {
  id: 'priya',
  githubLogin: 'priya',
  displayName: 'Priya Raman',
  avatarUrl: null,
}

it('keeps the shared change order and quotes each name for agent text', () => {
  expect(
    capabilityChangeText(member, [
      { kind: 'mac-access', on: false },
      { kind: 'value-given', names: ['C'] },
      { kind: 'pre-approved', names: ['A', 'B'] },
      { kind: 'session-approval-removed', names: ['D'] },
      { kind: 'value-removed', names: ['E', 'F'] },
      { kind: 'pre-approval-removed', names: ['G'] },
    ]),
  ).toBe(
    'Priya Raman pre-approved `A` and `B`, removed the pre-approval of `G`, removed the approval of `D` for this session, gave `C` for this workspace, removed the values of `E` and `F` for this workspace, and turned Mac access off.',
  )
})

it('uses the login as fallback and includes the Mac command rules only when enabled', () => {
  expect(
    capabilityChangeText({ ...member, displayName: null }, [
      { kind: 'mac-access', on: true },
    ]),
  ).toBe(
    'priya turned Mac access on. Agents can ask to run commands on the Mac of the member whose message started the turn. The Mac app still asks before each command that its user did not always allow.',
  )
  expect(
    capabilityChangeNoteWords(
      member,
      [{ kind: 'mac-access', on: false }],
      member.id,
    ),
  ).toEqual(['You ', 'turned Mac access off', '.'])
})

it('keeps embedded Markdown in member and secret names as data in copies', () => {
  expect(
    capabilityChangeText(
      { ...member, displayName: '*Priya*' },
      [{ kind: 'value-given', names: ['KEY`NAME'] }],
      true,
    ),
  ).toBe('\\*Priya\\* gave ``KEY`NAME`` for this workspace.')
})
