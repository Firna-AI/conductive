import { useEffect, useState } from 'react'
import type { OrgRole } from '../../shared/api'
import type { Viewport } from '../ui/controls'
import { computerScenes, type ComputerScene } from './devComputer'
import { devOrgIds, type DevOrgId } from './devOrgs'
import { devFailures, type DevFailure } from './devServer'

/** The screens of the dev page. */
const devViews = [
  'general',
  'repositories',
  'computer',
  'members',
  'deleted',
  'workspace',
  'menu-lab',
] as const
export type DevView = (typeof devViews)[number]

/** What the dev page draws, read from its query string. */
export type DevOptions = {
  view: DevView
  org: DevOrgId
  role: OrgRole
  viewport: Viewport
  scheme: 'dark' | 'light'
  failure: DevFailure | null
  /** The failure happens only for the first matching request. */
  once: boolean
  /** A delay before each reply, in ms, so that the busy states show. */
  delay: number
  /** An org whose replies wait four times as long as the others. */
  slow: DevOrgId | null
  computer: ComputerScene
  /** The number of Acme's members, such as 40, or 0 for the fixtures. */
  people: number
  /** The menu lab's space above its owner button, in px. */
  top: number
}

function pick<T extends string>(
  values: readonly T[],
  raw: string | null,
  fallback: T,
): T {
  return values.find((value) => value === raw) ?? fallback
}

/** A whole number of 0 or more from the query string, or the fallback. */
function count(raw: string | null, fallback: number): number {
  const value = Number(raw ?? fallback)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

export function readDevOptions(params: URLSearchParams): DevOptions {
  const delay = Number(params.get('delay') ?? 0)
  return {
    view: pick(devViews, params.get('view'), 'members'),
    org: pick(devOrgIds, params.get('org'), 'acme'),
    role: pick<OrgRole>(['admin', 'member'], params.get('role'), 'admin'),
    viewport: pick<Viewport>(
      ['desktop', 'mobile'],
      params.get('viewport'),
      'desktop',
    ),
    scheme: pick(['dark', 'light'], params.get('scheme'), 'dark'),
    failure: devFailures.find((item) => item === params.get('fail')) ?? null,
    once: params.get('once') === '1',
    delay: Number.isFinite(delay) && delay > 0 ? delay : 0,
    slow: devOrgIds.find((item) => item === params.get('slow')) ?? null,
    computer: pick(computerScenes, params.get('computer'), 'history'),
    people: count(params.get('people'), 0),
    top: count(params.get('top'), 96),
  }
}

/** The address of another view, with the other options kept. */
export function devHref(options: DevOptions, view: DevView): string {
  const params = new URLSearchParams({
    view,
    org: options.org,
    role: options.role,
    viewport: options.viewport,
    scheme: options.scheme,
    computer: options.computer,
  })
  if (options.failure) params.set('fail', options.failure)
  if (options.once) params.set('once', '1')
  if (options.delay > 0) params.set('delay', String(options.delay))
  if (options.slow) params.set('slow', options.slow)
  if (options.people > 0) params.set('people', String(options.people))
  if (options.view === 'menu-lab') params.set('top', String(options.top))
  return `?${params.toString()}`
}

function fromLocation(): DevOptions {
  return readDevOptions(new URLSearchParams(window.location.search))
}

/**
 * The options of the address, as a shell keeps its scope in the address.
 * Back and Forward change them without a reload, so the mounted parts get
 * new props. `navigate` adds an entry to the history.
 */
export function useDevOptions(): [
  DevOptions,
  (changes: Partial<DevOptions>) => void,
] {
  const [options, setOptions] = useState(fromLocation)
  useEffect(() => {
    const follow = () => setOptions(fromLocation())
    window.addEventListener('popstate', follow)
    return () => window.removeEventListener('popstate', follow)
  }, [])
  function navigate(changes: Partial<DevOptions>) {
    const next = { ...options, ...changes }
    window.history.pushState(null, '', devHref(next, next.view))
    setOptions(next)
  }
  return [options, navigate]
}
