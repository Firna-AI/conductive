import type { FileListKind } from '../../../files/navigation'
import type { RunnerReportKind } from '../../../shared/runner'
import type { ColorScheme } from '../../ui/ThemeRoot'
import type { Viewport } from '../../ui/viewport'
import type { PhoneView } from '../WorkspaceColumns'

/**
 * The state of the development page, from its address. Development only.
 *
 * - `repair=name,start,all-files,changes`: the kinds whose fresh full report
 *   the stored history lost. The default, `name,changes`, is the picture
 *   of the mockups. `none` stores no failure.
 * - `viewport=desktop|phone`: the layout. The default follows the window.
 * - `scheme=dark|light`: the colours. The default follows the system.
 * - `view=files|chat|terminal|preview|desktop`: the tab of a phone.
 * - `list=changes|all|checks`: the list of the Files panel.
 * - `controls=off`: hides the controls, as for a picture.
 */
export interface DevOptions {
  repair: readonly RunnerReportKind[]
  viewport: Viewport | null
  scheme: ColorScheme | undefined
  view: PhoneView
  list: FileListKind
  controls: boolean
}

const kinds: Readonly<Record<string, RunnerReportKind>> = {
  name: 'workspace.title',
  start: 'start.updated',
  'all-files': 'files.snapshot',
  changes: 'changes.updated',
}

function pick<T extends string>(
  query: URLSearchParams,
  key: string,
  values: readonly T[],
): T | undefined {
  return values.find((value) => value === query.get(key))
}

export function readDevOptions(search: string): DevOptions {
  const query = new URLSearchParams(search)
  const repair = (query.get('repair') ?? 'name,changes').split(',')
  return {
    repair: Object.entries(kinds)
      .filter(([name]) => repair.includes(name))
      .map(([, kind]) => kind),
    viewport: pick<Viewport>(query, 'viewport', ['desktop', 'phone']) ?? null,
    scheme: pick<ColorScheme>(query, 'scheme', ['dark', 'light']),
    view:
      pick<PhoneView>(query, 'view', [
        'files',
        'chat',
        'terminal',
        'preview',
        'desktop',
      ]) ?? 'files',
    list:
      pick<FileListKind>(query, 'list', ['changes', 'all', 'checks']) ??
      'changes',
    controls: query.get('controls') !== 'off',
  }
}
