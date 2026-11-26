import { isSkillsRepository } from '../../../src/shared/skill-folders'
import type { HelperOptions } from './generated/HelperOptions'
import type { HelperRequest } from './generated/HelperRequest'
import type { HelperSkillSource } from './generated/HelperSkillSource'
import type { HelperCredential } from './generated/HelperCredential'
import type { OrgSkills } from './generated/OrgSkills'
import type { ProviderInput } from './generated/ProviderInput'
import type { RunnerBranches } from './generated/RunnerBranches'
import type { RunnerRepository } from './generated/RunnerRepository'
import type { RunnerNoticeLine } from './generated/RunnerNoticeLine'
import {
  array,
  boolean,
  integer,
  nullable,
  object,
  oneOf,
  string,
} from './parse'
import {
  parseChoice,
  parseCredential,
  parseCommitAuthor,
  parseUserMessage,
} from './read-input'

function branches(value: unknown): RunnerBranches {
  const input = object(value)
  return {
    workspaceBranch: string(input.workspaceBranch),
    targetBranch: string(input.targetBranch),
  }
}

function repository(value: unknown): RunnerRepository {
  const input = object(value)
  return { fullName: string(input.fullName), folder: string(input.folder) }
}

function credential(value: unknown): HelperCredential {
  const input = object(value)
  if (input.type === 'gateway')
    return { type: 'gateway', ...parseCredential(input) }
  if (input.type === 'native') {
    const login = object(input.login)
    return {
      type: 'native',
      login: {
        agent: oneOf(login.agent, ['claude', 'codex']),
        kind: oneOf(login.kind, ['token', 'api-key']),
        secret: string(login.secret),
      },
    }
  }
  throw new Error('The helper credential is invalid.')
}

function orgSkills(value: unknown): OrgSkills | null {
  if (value === null) return null
  const input = object(value)
  const repository = string(input.repository)
  if (!isSkillsRepository(repository)) return null
  return {
    repository,
    ...(input.trustedRepository === undefined
      ? {}
      : { trustedRepository: nullable(input.trustedRepository) }),
    ...(input.directory === undefined
      ? {}
      : { directory: nullable(input.directory) }),
  }
}

function skillSource(value: unknown): HelperSkillSource {
  const input = object(value)
  if (input.type === 'file') return { type: 'file', path: string(input.path) }
  if (input.type === 'org') {
    const skills = orgSkills(input.orgSkills)
    if (skills?.directory)
      return {
        type: 'org',
        repository: string(input.repository),
        orgSkills: skills,
        agent: oneOf(input.agent, ['claude', 'codex']),
        name: string(input.name),
      }
  }
  throw new Error('The helper skill source is invalid.')
}

function options(value: unknown): HelperOptions {
  const input = object(value)
  const tools = object(input.tools)
  return {
    cwd: string(input.cwd),
    home: string(input.home),
    ...(input.orgSkills === undefined
      ? {}
      : { orgSkills: orgSkills(input.orgSkills) }),
    sessionId: string(input.sessionId),
    endpoint: string(input.endpoint),
    credential: credential(input.credential),
    commitAuthor: parseCommitAuthor(input.commitAuthor, () => {}),
    choice: parseChoice(input.choice),
    conversationId: nullable(input.conversationId),
    instructions: string(input.instructions),
    ...(input.instructionBranches === undefined
      ? {}
      : {
          instructionBranches:
            input.instructionBranches === null
              ? null
              : branches(input.instructionBranches),
        }),
    ...(input.instructionFolder === undefined
      ? {}
      : { instructionFolder: nullable(input.instructionFolder) }),
    tools: {
      machineOrigin: string(tools.machineOrigin),
      workspaceToken: string(tools.workspaceToken),
      turnId: string(tools.turnId),
    },
    backgroundNoteIds: array(input.backgroundNoteIds, string),
  }
}

function notices(value: unknown): RunnerNoticeLine[] {
  return array(value, (value) => {
    const notice = object(value)
    return { id: string(notice.id), text: string(notice.text) }
  })
}

function providerInput(value: unknown): ProviderInput {
  const input = object(value)
  const identity = {
    commandId: string(input.commandId),
    sessionId: string(input.sessionId),
    turnId: string(input.turnId),
  }
  if (input.type === 'notice')
    return { ...identity, type: 'notice', notices: notices(input.notices) }
  const command = {
    ...identity,
    message: parseUserMessage(input.message),
    attachments: array(input.attachments, (value) => {
      const file = object(value)
      return {
        attachmentId: string(file.attachmentId),
        path: string(file.path),
      }
    }),
    ...(input.branches === undefined
      ? {}
      : { branches: branches(input.branches) }),
    ...(input.repository === undefined
      ? {}
      : { repository: repository(input.repository) }),
  }
  if (input.type === 'message') return { ...command, type: 'message' }
  if (input.type === 'turn')
    return {
      ...command,
      type: 'turn',
      ...(input.notices === undefined
        ? {}
        : { notices: notices(input.notices) }),
      credential: parseCredential(input.credential),
      commitAuthor: parseCommitAuthor(input.commitAuthor, () => {}),
    }
  throw new Error('The helper input is invalid.')
}

export function readRequest(value: unknown): HelperRequest {
  const input = object(value)
  const requestId = string(input.requestId)
  switch (input.type) {
    case 'start':
      return { type: 'start', requestId, options: options(input.options) }
    case 'send':
      return {
        type: 'send',
        requestId,
        input: providerInput(input.input),
        ...(input.skills === undefined
          ? {}
          : {
              skills: array(input.skills, (value) => {
                const skill = object(value)
                return { name: string(skill.name), path: string(skill.path) }
              }),
            }),
      }
    case 'skills':
      return {
        type: 'skills',
        requestId,
        repository: string(input.repository),
        home: string(input.home),
        reload: boolean(input.reload),
        ...(input.orgSkills === undefined
          ? {}
          : { orgSkills: orgSkills(input.orgSkills) }),
      }
    case 'skill.read':
      return {
        type: 'skill.read',
        requestId,
        maxBytes: integer(input.maxBytes),
        source: skillSource(input.source),
      }
    case 'model':
      return { type: 'model', requestId, choice: parseChoice(input.choice) }
    case 'interrupt':
    case 'close':
    case 'warm':
      return { type: input.type, requestId }
    default:
      throw new Error('The helper request is invalid.')
  }
}
