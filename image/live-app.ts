import { randomUUID } from 'node:crypto'

import type { SendMessageRequest } from '../src/shared/messages'
import { sessionPaths } from '../src/shared/sessions'
import {
  workspacesPath,
  workspacePath,
  workspacePaths,
} from '../src/shared/workspaces'
import { LiveBoat } from './live-boat'
import {
  CheckError,
  object,
  text,
  until,
  type LiveConfiguration,
} from './live-input'
import { LiveStream } from './live-stream'

export class LiveApp {
  private readonly config: LiveConfiguration

  constructor(config: LiveConfiguration) {
    this.config = config
  }

  async request(path: string, body?: unknown) {
    const response = await fetch(new URL(path, this.config.appOrigin), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: this.config.cookie,
        Origin: this.config.appOrigin,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok)
      throw new CheckError(
        `The app route failed with HTTP ${response.status}. Check lifecycle admission and the account's stored agent login.`,
      )
    return object(await response.json())
  }

  private message(value: string): SendMessageRequest {
    return {
      id: randomUUID(),
      text: value,
      attachmentIds: [],
      choice: this.config.choice,
    }
  }

  async run(
    boat: LiveBoat,
    allocated: (workspaceId: string, sandboxId?: string) => void,
  ) {
    const marker = `live-check-${randomUUID()}`
    const first = this.message(
      `Remember this code: ${marker}. Reply with only that code. Do not run tools.`,
    )
    const created = await this.request(workspacesPath(this.config.orgId), {
      repositoryId: this.config.repositoryId,
      firstMessage: first,
    })
    const workspaceId = text(object(created.workspace).id)
    allocated(workspaceId)
    const sessionId = text(created.sessionId)
    const stream = new LiveStream(this.config, workspaceId)
    try {
      await stream.opened()
      const sandboxId = await boat.findWorkspace(workspaceId)
      allocated(workspaceId, sandboxId)
      const initial = await stream.turn(first.id, marker, false)
      const second = this.message(
        `Reply with only the code from my first message. Do not run tools.`,
      )
      await this.request(
        sessionPaths.messages(this.config.orgId, workspaceId, sessionId),
        second,
      )
      const beforeStop = await stream.turn(second.id, marker, true)
      await boat.stop(sandboxId)
      await until(async () => {
        const result = await this.request(
          workspacePath(this.config.orgId, workspaceId),
        )
        return object(result.workspace).state === 'stopped' ? true : null
      }, 'the app to report the stopped workspace')
      await this.request(
        workspacePaths.resume(this.config.orgId, workspaceId),
        {},
      )
      await boat.ready(sandboxId)
      const third = this.message(
        'Repeat only the code from my first message. Do not run tools.',
      )
      await this.request(
        sessionPaths.messages(this.config.orgId, workspaceId, sessionId),
        third,
      )
      const afterResume = await stream.turn(third.id, marker, true)
      return {
        workspaceId,
        sessionId,
        sandboxId,
        initial,
        beforeStop,
        afterResume,
        orderedThrough: stream.through,
        agent: this.config.choice.agent,
        model: this.config.choice.model,
        machineOrigin: this.config.machineOrigin,
      }
    } finally {
      stream.close()
    }
  }
}
