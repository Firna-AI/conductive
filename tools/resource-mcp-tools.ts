import {
  readAnnotations,
  toolContext,
  workspaceId,
  writeAccess,
  writeAnnotations,
} from './mcp-schema.ts'

export const RESOURCE_MCP_TOOLS = [
  {
    name: 'create_section',
    description: `Create a section in this org. ${writeAccess}`,
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', minLength: 1 } },
      required: ['name'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'delete_section',
    description: `Delete an org section and move its workspaces to General. The default section stays and returns deleted: false. ${writeAccess}`,
    inputSchema: {
      type: 'object',
      properties: {
        sectionId: {
          type: 'string',
          minLength: 1,
          description: 'A section ID from list_sections.',
        },
      },
      required: ['sectionId'],
    },
    annotations: { ...writeAnnotations, destructiveHint: true },
  },
  {
    name: 'list_previews',
    description: `List open previews and their links. Needs only the workspace token. Preview links need sign-in. ${toolContext}`,
    inputSchema: { type: 'object', properties: { workspaceId } },
    annotations: readAnnotations,
  },
  {
    name: 'open_preview',
    description: `Open a private port preview and return its link. The link needs sign-in. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        port: { type: 'integer', minimum: 1, maximum: 65535 },
      },
      required: ['port'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'close_preview',
    description: `Close a preview. An already closed preview succeeds with closed: false. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        previewId: {
          type: 'string',
          minLength: 1,
          description: 'A preview ID from list_previews or open_preview.',
        },
      },
      required: ['previewId'],
    },
    annotations: writeAnnotations,
  },
] as const
