import { ACCOUNT_PATHS } from '../../shared/account'
import { ShortcutContractError } from '../../shared/shortcut-key'
import { readSaveShortcutsRequest } from '../../shared/shortcut-read'
import type {
  SaveShortcutsRequest,
  SaveShortcutsResponse,
} from '../../shared/shortcuts'
import type { DevBackend } from './backend'
import { json, RouteError, type Route } from './router'

function saveShortcuts(backend: DevBackend, body: unknown): Response {
  let update: SaveShortcutsRequest
  try {
    update = readSaveShortcutsRequest(body)
  } catch (error) {
    if (error instanceof ShortcutContractError)
      throw new RouteError(400, 'invalid_input', error.message)
    throw error
  }
  const shortcuts = backend.state.account.shortcuts
  const saved = new Map(
    shortcuts[update.keyboard].map((change) => [change.command, change]),
  )
  for (const change of update.changes) {
    if (change.keys === null) saved.delete(change.command)
    else
      saved.set(change.command, { command: change.command, keys: change.keys })
  }
  const changes = [...saved.values()].sort((a, b) =>
    a.command < b.command ? -1 : a.command > b.command ? 1 : 0,
  )
  backend.state.account = {
    ...backend.state.account,
    shortcuts: { ...shortcuts, [update.keyboard]: changes },
  }
  return json({
    keyboard: update.keyboard,
    changes,
  } satisfies SaveShortcutsResponse)
}

export function shortcutRoutes(backend: DevBackend): Route[] {
  return [
    {
      method: 'PUT',
      path: ACCOUNT_PATHS.shortcuts,
      answer: ({ body }) => saveShortcuts(backend, body),
    },
  ]
}
