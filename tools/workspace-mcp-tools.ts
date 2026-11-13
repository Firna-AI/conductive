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
    description: `Create a workspace with this workspace's owner and start its first message. ${writeAccess} Omitted choices use the owner's defaults. The reply gives the workspace number and link, and the first session link. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: {
          type: 'string',
          minLength: 1,
          description: 'A repository ID from list_repositories.',
        },
        firstMessage: { type: 'string', minLength: 1 },
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
    description: `List workspaces with their number, link, name, branch, state, and owner ID, login, and display name. Needs only the workspace token. Without filters or paging, returns every workspace that is not removed, including archives. Set removed true to list only removed workspaces. Each filter must match. Use the actual message sender's member ID for their workspaces. Find another owner's ID in returned owner fields. Do not infer the owner from the token or active turn. ${toolContext}`,
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
            'Select archived workspaces with true, or other workspaces with false. Removed workspaces need removed true.',
        },
        removed: {
          type: 'boolean',
          description:
            'Select only removed workspaces with true. False or omission leaves them out.',
        },
        ...paging,
      },
    },
    annotations: readAnnotations,
  },
  {
    name: 'get_workspace',
    description: `Get workspace details, including owner, repository, base branch, section, activity, archive, restore, and removal times. Reads removed workspaces too. Needs only the workspace token. ${toolContext}`,
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
    description: `Archive a workspace. Only its owner or an org admin can archive it. Archiving the calling workspace ends this turn. A member can restore it for 14 days. Then it leaves the workspace list. ${writeAccess} ${toolContext}`,
    inputSchema: { type: 'object', properties: { workspaceId } },
    annotations: { ...writeAnnotations, destructiveHint: true },
  },
] as const
