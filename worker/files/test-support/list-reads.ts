import type { FilesListRead, WorkspaceFileLists } from '../list-reads'
import type { WorkspaceFilesPort } from '../workspace'

export function standaloneFileLists(
  files: (workspaceId: string) => WorkspaceFilesPort,
): WorkspaceFileLists {
  async function read<List>(
    list: Promise<List | null>,
  ): Promise<FilesListRead<List>> {
    return {
      list: await list,
      stateRead: { eventNumber: 0, repositoryId: null, failure: null },
    }
  }
  return {
    tree: (id) => read(files(id).tree()),
    changes: (id) => read(files(id).changes()),
  }
}
