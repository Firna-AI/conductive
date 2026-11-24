import { expect, it } from 'vitest'

import { readUserMessage } from '../../chat/api/read-chat'
import {
  readEnvelope as readChatEnvelope,
  readWorkspaceResponse as readChatWorkspace,
} from '../../chat/api/read-workspace'
import { parseWorkspace, parseWorkspaces } from '../../members/api/parseCore'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import {
  readAttachment,
  readCreated,
  readOrderedWorkspaceResponse,
  readWorkspace,
} from './read-workspaces'

const attachment = {
  id: 'image',
  name: 'Login screen.png',
  path: '.context/attachments/image/Login-screen.png',
  kind: 'image',
  mediaType: 'image/png',
  sizeBytes: 25,
}

it('reads upload and sent paths and gives old stored files a null path', () => {
  const { created } = workspaceFixtures()
  for (const path of [attachment.path, null, undefined]) {
    const file = { ...attachment, path }
    const message = { ...created.firstMessage, attachments: [file] }
    expect(readAttachment(file)).toEqual({ ...file, path: path ?? null })
    expect(readUserMessage(message).attachments).toEqual([
      { ...file, path: path ?? null },
    ])
    expect(
      readCreated({ ...created, firstMessage: message }).firstMessage
        .attachments,
    ).toEqual([{ ...file, path: path ?? null }])
  }
})

it('preserves the parent and each GitHub summary in shell, chat, and member workspace records', () => {
  const { detail } = workspaceFixtures()
  for (const github of [
    'checks-running',
    'checks-failed',
    'ready-to-merge',
    'merged',
    'conflict',
    'changes-requested',
    'draft',
    'blocked',
    null,
  ]) {
    const workspace = { ...detail.workspace, parentId: 'parent', github }
    expect(readWorkspace(workspace).github).toBe(github)
    expect(readWorkspace(workspace).parentId).toBe('parent')
    expect(readChatWorkspace({ ...detail, workspace }).workspace.github).toBe(
      github,
    )
    expect(readChatWorkspace({ ...detail, workspace }).workspace.parentId).toBe(
      'parent',
    )
    expect(parseWorkspace(workspace).github).toBe(github)
    expect(parseWorkspace(workspace).parentId).toBe('parent')
  }
})

it('reads older shell, chat, and member replies without a GitHub summary or a parent as null', () => {
  const { detail } = workspaceFixtures()
  const workspace = { ...detail.workspace }
  Reflect.deleteProperty(workspace, 'github')
  Reflect.deleteProperty(workspace, 'parentId')
  expect(readWorkspace(workspace).github).toBeNull()
  expect(readWorkspace(workspace).parentId).toBeNull()
  const chat = readChatWorkspace({ ...detail, workspace }).workspace
  expect(chat.github).toBeNull()
  expect(chat.parentId).toBeNull()
  expect(parseWorkspace(workspace).github).toBeNull()
  expect(parseWorkspace(workspace).parentId).toBeNull()
})

it('keeps archived computer evidence and accepts absent or unknown optional values in every browser reader', () => {
  const { detail } = workspaceFixtures()
  const archivedComputer = {
    state: 'may-exist',
    restoreUntil: 1_801_209_600_000,
  }
  const archived = {
    ...detail.workspace,
    state: 'archived',
    archivedAt: 1_800_000_000_000,
    restoreUntil: null,
  }
  const readers = [
    readWorkspace,
    (value: unknown) =>
      readChatWorkspace({ ...detail, workspace: value }).workspace,
    parseWorkspace,
  ]
  for (const read of readers) {
    expect(read({ ...archived, archivedComputer })).toMatchObject({
      archivedComputer,
    })
    for (const optional of [
      undefined,
      null,
      'deleted',
      { state: 'future-state', restoreUntil: 1_801_209_600_000 },
      { state: 'deleted', restoreUntil: 'unknown' },
    ])
      expect(
        read({ ...archived, archivedComputer: optional }),
      ).not.toHaveProperty('archivedComputer')
  }
})

it('keeps the response fields used by shell creation, chat streams, and the Members list', () => {
  const { created } = workspaceFixtures()
  const workspace = {
    ...created.workspace,
    owner: senderSnapshot(created.workspace.owner),
  }
  const firstMessage = {
    ...created.firstMessage,
    sender: senderSnapshot(created.firstMessage.sender),
  }
  const error = {
    code: 'start_failed',
    message: 'The cloud computer did not start. Try again.',
    log: 'Saved start log',
  }
  const creation = { ...created, workspace, firstMessage, error }
  expect(readCreated(creation)).toEqual(creation)

  const detail = {
    workspace,
    start: created.start,
    error,
    eventNumber: 71,
  }
  expect(readOrderedWorkspaceResponse(detail)).toEqual(detail)
  expect(readChatWorkspace(detail)).toEqual(detail)
  expect(parseWorkspaces({ workspaces: [workspace] })).toEqual({
    workspaces: [workspace],
  })

  const envelope = {
    workspaceId: workspace.id,
    eventNumber: 72,
    occurredAt: 1_800_000_003_000,
    event: {
      type: 'workspace.updated',
      workspace,
      error: { code: error.code, message: error.message },
    },
    late: true,
  }
  expect(readChatEnvelope(envelope)).toEqual(envelope)
})

it('reads the workspace seed at its cutoff and still gives chat the ordered detail', () => {
  const { detail: fixture } = workspaceFixtures()
  const detail = {
    ...fixture,
    workspace: {
      ...fixture.workspace,
      owner: senderSnapshot(fixture.workspace.owner),
    },
    eventNumber: 71,
  }
  const seed = {
    ports: {
      eventNumber: 51,
      occurredAt: 1_800_000_000_000,
      event: { type: 'ports.updated', ports: null },
    },
    skills: {
      eventNumber: 66,
      occurredAt: 1_800_000_001_000,
      event: { type: 'skills.updated', skills: null },
    },
    failures: {
      'workspace.title': {
        eventNumber: 64,
        occurredAt: 1_800_000_000_500,
        event: {
          type: 'runner.event-refused',
          streamId: 'runner-1',
          runnerEventNumber: 18,
          runnerEventType: 'workspace.title',
          reason: 'too_large',
          sessionId: null,
          turnId: null,
          repairFailed: true,
        },
      },
      'start.updated': null,
      'ports.updated': null,
    },
  }
  expect(readOrderedWorkspaceResponse({ ...detail, seed })).toEqual({
    ...detail,
    seed,
  })
  expect(readChatWorkspace({ ...detail, seed })).toEqual(detail)
  for (const invalid of [
    { ...seed, skills: { ...seed.skills, eventNumber: 72 } },
    { ...seed, ports: { ...seed.ports, event: { type: 'ports.updated' } } },
    { ...seed, failures: { 'workspace.title': null } },
  ]) {
    expect(readOrderedWorkspaceResponse({ ...detail, seed: invalid })).toEqual(
      detail,
    )
  }
})
