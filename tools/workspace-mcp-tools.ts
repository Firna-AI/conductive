import {
  modelChoice,
  paging,
  readAnnotations,
  requestId,
  toolContext,
  workspaceId,
  writeAccess,
  writeAnnotations,
} from './mcp-schema.ts'

export const WORKSPACE_CALLS = [
  {
    name: 'create_workspace',
    description: `Create a workspace with this workspace's owner and start its first message. ${writeAccess} Omitted model and effort use the owner's defaults. An omitted section uses the default section. The reply gives the workspace number and link, and the first session link. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: {
          type: 'string',
          minLength: 1,
          description: 'A repository ID from list_repositories.',
        },
        firstMessage: { type: 'string', minLength: 1 },
        startBranch: {
          type: 'string',
          description:
            'Create the workspace branch from this branch. Omission uses baseBranch, or the repository default when both branches are omitted.',
        },
        baseBranch: {
          type: 'string',
          description:
            'Use this branch for the pull request target and Changes comparison. Omission uses startBranch, or the repository default when both branches are omitted.',
        },
        name: {
          type: 'string',
          description:
            'Optional workspace name. Use plain words separated by spaces. Avoid underscores unless the user tells you to add them. The app keeps the first line, without a final full stop, cut to 60 characters at a word.',
        },
        firstSessionTitle: {
          type: 'string',
          description:
            'Optional first session title. Use plain words separated by spaces. Avoid underscores unless the user tells you to add them.',
        },
        ...modelChoice,
        sectionId: {
          type: 'string',
          minLength: 1,
          description:
            'A section ID from list_sections. Omission uses the default section.',
        },
        requestId,
      },
      required: ['repositoryId', 'firstMessage'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'list_workspaces',
    description: `List workspaces with their number, link, name, branch, state, and owner ID, login, and display name. Needs only the workspace token. Without filters or paging, returns every workspace, including archives. Use the actual message sender's member ID for their workspaces. Find another owner's ID in returned owner fields. Do not infer the owner from the token or active turn. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        ownerId: {
          type: 'string',
          minLength: 1,
          description:
            'A stable member ID from the actual message Sender line or workspace owner fields. A login is not an ID.',
        },
        state: {
          type: 'string',
          enum: [
            'working',
            'input',
            'unread',
            'ready',
            'starting',
            'stopped',
            'error',
            'archived',
          ],
        },
        repositoryId: { type: 'string', minLength: 1 },
        query: { type: 'string', description: 'Part of the workspace name.' },
        updatedSince: {
          type: 'integer',
          description:
            'Signed safe-integer epoch timestamp in milliseconds. Select newer activity.',
        },
        archived: {
          type: 'boolean',
          description:
            'Select archived workspaces with true, or other workspaces with false.',
        },
        ...paging,
      },
    },
    annotations: readAnnotations,
  },
  {
    name: 'get_workspace',
    description: `Get workspace details, including owner, repository, base branch, section, activity, and restore times. Needs only the workspace token. ${toolContext}`,
    inputSchema: { type: 'object', properties: { workspaceId } },
    annotations: readAnnotations,
  },
  {
    name: 'rename_workspace',
    description: `Rename a workspace. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        name: {
          type: 'string',
          minLength: 1,
          description:
            'Use plain words separated by spaces. Avoid underscores unless the user tells you to add them.',
        },
      },
      required: ['name'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'move_workspace',
    description: `Move a workspace to the top of an org section. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sectionId: {
          type: 'string',
          minLength: 1,
          description: 'A section ID from list_sections.',
        },
      },
      required: ['sectionId'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'archive_workspace',
    description: `Archive a workspace. Only its owner or an org admin can archive it. Archiving the calling workspace ends this turn. A member can restore it for 14 days. ${writeAccess} ${toolContext}`,
    inputSchema: { type: 'object', properties: { workspaceId } },
    annotations: { ...writeAnnotations, destructiveHint: true },
  },
] as const
