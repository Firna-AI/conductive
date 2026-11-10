import {
  DRAFT_ATTACHMENTS_PATH,
  type Attachment,
  type MessageSender,
  type SendMessageRequest,
  type UploadAttachmentResponse,
} from '../../shared/messages'
import {
  workspacesPath,
  type CreateWorkspaceResponse,
  type Workspace,
} from '../../shared/workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { choice, maybeText, nested, record, text, texts } from '../api/parse'
import { readChoice } from '../api/read-core'
import { defaultSection } from '../sections'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, requiredText, RouteError, type Route } from './router'
import { createPlan, runStart } from './start-steps'
import { slugify, type OrgState } from './state'

/** The cities that name new workspaces: the recorded one, Lisbon, first. */
const CITIES = [
  workspaceFixtures().created.workspace.name,
  'Porto',
  'Kyoto',
  'Oslo',
  'Lima',
  'Hobart',
  'Tallinn',
]
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Four random characters, as a branch has after its city. */
function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

/** The city that names the next new workspace of the org. */
function cityFor(org: OrgState): string {
  return CITIES[org.created.size % CITIES.length]
}

/** A new ID such as `lisbon-7k2q`, which the branch name ends with. */
function newWorkspaceId(org: OrgState, city: string): string {
  const taken = new Set(org.workspaces.map((item) => item.id))
  const base = slugify(city, 'workspace')
  let id = `${base}-${randomSuffix()}`
  while (taken.has(id)) id = `${base}-${randomSuffix()}`
  return id
}

/** The number of bytes that a base64 text holds. */
function decodedSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

/** An upload before the workspace exists, with its own ID and its own name. */
function uploadAttachment(backend: DevBackend, body: unknown): Response {
  const fields = record(body)
  const attachment: Attachment = {
    id: backend.newId(),
    name: requiredText(fields, 'name'),
    kind: choice(fields, 'kind', ['image', 'file']),
    mediaType: requiredText(fields, 'mediaType'),
    sizeBytes: decodedSize(text(fields, 'dataBase64')),
  }
  backend.state.attachments.set(attachment.id, attachment)
  return json({ attachment } satisfies UploadAttachmentResponse, 201)
}

function readFirstMessage(value: unknown): SendMessageRequest {
  const message = record(value, 'firstMessage')
  requiredText(message, 'text')
  return {
    id: requiredText(message, 'id'),
    text: text(message, 'text'),
    attachmentIds: texts(message, 'attachmentIds'),
    choice: nested(message, 'choice', readChoice),
  }
}

/** What a new workspace needs: its repository, its section, and its first message. */
export interface WorkspaceRequest {
  repositoryId: string
  /** The section, or null for General. */
  sectionId: string | null
  first: SendMessageRequest
}

/**
 * Makes a workspace from its first message, in the section of the request
 * or else in General, and starts its cloud computer. Its name is a city,
 * and its branch is the login of the user, the city, and four random
 * characters. A first message that contains `fail` stands for a cloud
 * computer that did not start: the fake makes nothing and throws.
 */
export function startWorkspace(
  backend: DevBackend,
  org: OrgState,
  request: WorkspaceRequest,
): CreateWorkspaceResponse {
  const { first, repositoryId } = request
  const repository = org.repositories.find((item) => item.id === repositoryId)
  if (!repository) {
    throw new RouteError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  }
  // A draft can outlive its section. Its workspace then goes to General,
  // so that Try again does not fail on the same section again.
  const section =
    org.sections.find((item) => item.id === request.sectionId) ??
    defaultSection(org.sections)
  if (first.text.includes('fail')) {
    throw new RouteError(
      502,
      'start_failed',
      'The cloud computer did not start. Try again.',
    )
  }
  const { user } = backend.state.account
  const owner: MessageSender = {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
  const city = cityFor(org)
  const id = newWorkspaceId(org, city)
  const branch = `${user.githubLogin}/${id}`
  const at = backend.now()
  const workspace: Workspace = {
    id,
    orgId: org.org.id,
    repositoryId,
    sectionId: section?.id ?? '',
    owner,
    name: city,
    branch,
    choice: first.choice,
    state: 'starting',
    createdAt: at,
    updatedAt: at,
    archivedAt: null,
  }
  org.workspaces = [workspace, ...org.workspaces]
  org.created.add(id)
  const plan = createPlan(org.org.name, repository, branch)
  const start = runStart(backend, org, id, 'create', plan)
  const sessionId = backend.newId()
  const attachments = first.attachmentIds.flatMap(
    (attachmentId) => backend.state.attachments.get(attachmentId) ?? [],
  )
  return {
    workspace,
    sessionId,
    firstMessage: {
      id: first.id,
      sessionId,
      sender: owner,
      text: first.text,
      attachments,
      choice: workspace.choice,
      createdAt: at,
      state: 'queued',
    },
    start,
    error: null,
  }
}

/** Create workspace, from the first message of the user. */
function createWorkspace(
  backend: DevBackend,
  org: OrgState,
  body: unknown,
): Response {
  const fields = record(body)
  const created = startWorkspace(backend, org, {
    repositoryId: requiredText(fields, 'repositoryId'),
    sectionId: maybeText(fields, 'sectionId'),
    first: readFirstMessage(fields.firstMessage),
  })
  return json(created satisfies CreateWorkspaceResponse, 201)
}

export function createRoutes(backend: DevBackend): Route[] {
  return [
    {
      method: 'POST',
      path: workspacesPath(ID.org),
      answer: ({ params, body }) =>
        createWorkspace(backend, requireOrg(backend.state, params.org), body),
    },
    {
      method: 'POST',
      path: DRAFT_ATTACHMENTS_PATH,
      answer: ({ body }) => uploadAttachment(backend, body),
    },
  ]
}
