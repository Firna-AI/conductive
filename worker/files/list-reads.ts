import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import type { FilesStateRead } from '../../src/shared/workspace-state-read'
import type { WorkspaceChat } from '../chat/backend'
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

export interface WorkspaceFileLists {
  tree(workspaceId: string): Promise<FilesListRead<FileTreeResponse>>
  changes(workspaceId: string): Promise<FilesListRead<ChangesResponse>>
}

export function workspaceFileLists(chat: WorkspaceChat): WorkspaceFileLists {
  function read<List>(
    workspaceId: string,
    notice: 'files.snapshot' | 'changes.updated',
    readList: (
      files: FilesStorage,
      manifest: FilesManifest,
    ) => Promise<List | null>,
  ): Promise<FilesListRead<List>> {
    return chat.readWorkspace(workspaceId, {
      withReadState: async (view) => {
        const manifest = await readFilesManifest(view.files)
        const list = await readList(view.files, manifest)
        const { repositoryId, failures } = await view.workspaceReadState()
        return {
          list,
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
    tree: (workspaceId) =>
      read(workspaceId, 'files.snapshot', (files, manifest) =>
        readFileList(files, manifest, 'tree'),
      ),
    changes: (workspaceId) =>
      read(workspaceId, 'changes.updated', (files, manifest) =>
        readFileList(files, manifest, 'changes'),
      ),
  }
}
