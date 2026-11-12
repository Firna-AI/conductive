import { workspaceToolsCommands } from './image'
import { WORKSPACE_TOOL_SOURCES } from './image-assets'

/** Image builds run the workspace tools install as this many commands. */
export const TOOLS_COMMAND_COUNT = workspaceToolsCommands(
  WORKSPACE_TOOL_SOURCES,
).length
