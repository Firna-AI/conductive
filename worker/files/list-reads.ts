import type { BrowserChangesResponse } from '../../src/shared/generated/BrowserChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import type { FilterText } from '../../src/shared/output-fields'
import type { FilesStateRead } from '../../src/shared/workspace-state-read'
import type { WorkspaceChat } from '../chat/backend'
import { runnerOutputLabelFilter } from '../chat/runner-output'
import type { AppEnv } from '../env'
import type { FilesWorkspace } from './data'
import {
  readFileList,
  readFilesManifest,
  type FilesManifest,
  type FilesStorage,
} from './storage'

export interface FilesListRead<List> {
  list: List | null
  stateRead: FilesStateRead
}

export type FilesListFilter<List> = (list: List, text: FilterText) => List

type FilesListWorkspace = Pick<FilesWorkspace, 'id' | 'orgId'>

type ReadFilesList<List> = (
  env: AppEnv,
  workspace: FilesListWorkspace,
  filter: FilesListFilter<List>,
) => Promise<FilesListRead<List>>

export interface WorkspaceFileLists {
  tree: ReadFilesList<FileTreeResponse>
  changes: ReadFilesList<BrowserChangesResponse>
}

export function workspaceFileLists(chat: WorkspaceChat): WorkspaceFileLists {
  function read<List>(
    env: AppEnv,
    workspace: FilesListWorkspace,
    notice: 'files.snapshot' | 'changes.updated',
    readList: (
      files: FilesStorage,
      manifest: FilesManifest,
    ) => Promise<List | null>,
    filter: FilesListFilter<List>,
  ): Promise<FilesListRead<List>> {
    return chat.readWorkspace(workspace.id, {
      withReadState: async (view) => {
        const manifest = await readFilesManifest(view.files)
        const list = await readList(view.files, manifest)
        const { repositoryId, failures } = await view.workspaceReadState()
        return {
          list:
            list &&
            filter(list, await runnerOutputLabelFilter(env, view, workspace)),
          stateRead: {
            eventNumber: view.eventNumber,
            repositoryId,
            failure: failures[notice],
          },
        }
      },
    })
  }
  return {
    tree: (env, workspace, filter) =>
      read(
        env,
        workspace,
        'files.snapshot',
        (files, manifest) => readFileList(files, manifest, 'tree'),
        filter,
      ),
    changes: (env, workspace, filter) =>
      read(
        env,
        workspace,
        'changes.updated',
        (files, manifest) => readFileList(files, manifest, 'changes'),
        filter,
      ),
  }
}
