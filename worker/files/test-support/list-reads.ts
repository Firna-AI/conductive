import type { AppEnv } from '../../env'
import { runningOutputSecrets } from '../../lifecycle/output-secrets'
import { secretTextFilter } from '../../secrets/output-values'
import type { FilesWorkspace } from '../data'
import type {
  FilesListFilter,
  FilesListRead,
  WorkspaceFileLists,
} from '../list-reads'
import type { WorkspaceFilesPort } from '../workspace'

export function standaloneFileLists(
  files: (workspaceId: string) => WorkspaceFilesPort,
): WorkspaceFileLists {
  async function read<List>(
    getList: Promise<List | null>,
    env: AppEnv,
    workspace: Pick<FilesWorkspace, 'id' | 'orgId'>,
    filter: FilesListFilter<List>,
  ): Promise<FilesListRead<List>> {
    const list = await getList
    return {
      list:
        list &&
        filter(
          list,
          secretTextFilter(await runningOutputSecrets(env, workspace)),
        ),
      stateRead: { eventNumber: 0, repositoryId: null, failure: null },
    }
  }
  return {
    tree: (env, workspace, filter) =>
      read(files(workspace.id).tree(), env, workspace, filter),
    changes: (env, workspace, filter) =>
      read(files(workspace.id).changes(), env, workspace, filter),
  }
}
