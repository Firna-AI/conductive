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
      { kind: 'value-given', names: ['C'] },
      { kind: 'pre-approved', names: ['A', 'B'] },
      { kind: 'session-approval-removed', names: ['D'] },
      { kind: 'value-removed', names: ['E', 'F'] },
      { kind: 'pre-approval-removed', names: ['G'] },
    ]),
  ).toBe(
    'Priya Raman pre-approved `A` and `B`, removed the pre-approval of `G`, removed the approval of `D` for this session, gave `C` for this workspace, and removed the values of `E` and `F` for this workspace.',
  )
})

it('uses the login as fallback and addresses the member who made the change as You', () => {
  expect(
    capabilityChangeText({ ...member, displayName: null }, [
      { kind: 'pre-approved', names: ['DEPLOY_KEY'] },
    ]),
  ).toBe('priya pre-approved `DEPLOY_KEY`.')
  expect(
    capabilityChangeNoteWords(
      member,
      [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
      member.id,
    ),
  ).toEqual([
    'You ',
    'removed the pre-approval of ',
    { name: 'DEPLOY_KEY' },
    '.',
  ])
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
