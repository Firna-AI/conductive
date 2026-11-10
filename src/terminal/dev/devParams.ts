import { useMemo, useSyncExternalStore } from 'react'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  devPortReports,
  devStates,
  devTools,
  type DevPortReport,
  type DevTool,
} from './devServer'

/** The settings of the development page. The address holds all of them. */
export interface DevParams {
  tool: DevTool
  layout: 'panel' | 'phone'
  scheme: 'dark' | 'light'
  state: string
  workspace: string
  preview: string | null
  /** The report of the listening ports that the fake events hold. */
  ports: DevPortReport
}

type DevChanges = Partial<Record<keyof DevParams, string | null>>

function oneOf<T extends string>(
  value: string | null,
  values: readonly T[],
): T {
  return values.find((item) => item === value) ?? values[0]
}

function parse(search: string): DevParams {
  const query = new URLSearchParams(search)
  const tool = oneOf(query.get('tool'), devTools)
  return {
    tool,
    layout: oneOf(query.get('layout'), ['panel', 'phone']),
    scheme: oneOf(query.get('scheme'), ['dark', 'light']),
    state: oneOf(query.get('state'), devStates[tool]),
    workspace: query.get('workspace') ?? FAKE_IDS.workspace,
    preview: query.get('preview'),
    ports: oneOf(query.get('ports'), devPortReports),
  }
}

/** The address of the page with some settings changed. */
export function devHref(params: DevParams, changes: DevChanges): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value !== null) query.set(key, value)
  }
  return `${location.pathname}?${query}`
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    removeEventListener('popstate', listener)
  }
}

/** Goes to an address of the page without a page load, as a link would. */
export function go(href: string): void {
  history.pushState(null, '', href)
  for (const listener of listeners) listener()
}

/** The settings of the current address. Back and forward change them. */
export function useDevParams(): DevParams {
  const search = useSyncExternalStore(subscribe, () => location.search)
  return useMemo(() => parse(search), [search])
}
