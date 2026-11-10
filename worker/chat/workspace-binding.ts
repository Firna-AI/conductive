import type { AppEnv } from '../env'
import { HttpError } from '../http'
import {
  authorizeChatBrowser,
  type BrowserAccess,
} from './browser-authorization'

export class ChatWorkspaceBinding {
  id: string | null = null
  private readonly matchesObject: (id: string) => boolean

  constructor(matchesObject: (id: string) => boolean) {
    this.matchesObject = matchesObject
  }

  async authorizeBrowser(
    request: Request,
    env: AppEnv,
    now: number,
  ): Promise<BrowserAccess> {
    const access = await authorizeChatBrowser(request, env, now)
    this.bind(access.workspace.id)
    return access
  }

  bind(workspaceId: string): void {
    if (
      !this.matchesObject(workspaceId) ||
      (this.id && this.id !== workspaceId)
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    this.id = workspaceId
  }
}
