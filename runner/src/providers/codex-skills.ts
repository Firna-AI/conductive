import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

import type { ToolCall } from '../../../src/shared/chat-events'
import { array, boolean, object, string } from '../parse'
import type { JsonRpc } from './rpc'

export class CodexSkills {
  private paths = new Map<string, string>()
  private readonly loaded = new Set<string>()
  private readonly items = new Map<string, readonly string[]>()
  private readonly cwd: string
  private readonly warn: (message: string) => void
  private revision = 0
  private warned = false

  constructor(cwd: string, warn: (message: string) => void) {
    this.cwd = cwd
    this.warn = warn
  }

  reload(rpc: JsonRpc): void {
    this.paths = new Map()
    void this.load(rpc, ++this.revision)
  }

  beginTurn(): void {
    this.loaded.clear()
    this.items.clear()
  }

  tool(item: Record<string, unknown>, tool: ToolCall): ToolCall {
    let names = this.items.get(tool.id)
    if (!names) {
      names = this.readNames(item)
      this.items.set(tool.id, names)
    }
    if (tool.state === 'done') {
      for (const name of names) this.loaded.add(name)
    }
    return names.length
      ? {
          ...tool,
          skills: names,
          target: names.join(', '),
          detail: string(item.command),
        }
      : tool
  }

  private async load(rpc: JsonRpc, revision: number): Promise<void> {
    try {
      const value = await rpc.request('skills/list', { cwds: [this.cwd] })
      const paths = new Map<string, string>()
      for (const entry of array(object(value).data, object)) {
        for (const skill of array(entry.skills, object)) {
          if (!boolean(skill.enabled)) continue
          paths.set(realpathSync(string(skill.path)), string(skill.name))
        }
      }
      if (revision === this.revision) this.paths = paths
    } catch {
      if (revision !== this.revision || this.warned) return
      this.warned = true
      this.warn(
        'The Codex skill list could not be read. The turn will continue.',
      )
    }
  }

  private readNames(item: Record<string, unknown>): readonly string[] {
    const names = new Set<string>()
    if (!Array.isArray(item.commandActions)) return []
    for (const value of item.commandActions) {
      try {
        const action = object(value)
        if (action.type !== 'read') continue
        const path = resolve(string(item.cwd), string(action.path))
        const name = this.paths.get(realpathSync(path))
        if (name && !this.loaded.has(name)) names.add(name)
      } catch {
        continue
      }
    }
    return [...names]
  }
}
