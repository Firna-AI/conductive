import { expect, it } from 'vitest'
import type { Preview } from '../shared/generated/Preview'
import {
  initialPreviews,
  panelPortList,
  previewOfPort,
  type PreviewsState,
} from './previewsState'

function preview(id: string, port: number, expiresAt: number): Preview {
  return { id, port, url: `https://${id}.conductive-previews.test/`, expiresAt }
}

const loaded: PreviewsState = { ...initialPreviews, load: null }

it('lists each server of the report, then each port with a tab or a preview that the report does not name', () => {
  const state: PreviewsState = {
    ...loaded,
    ports: [
      { port: 5173, name: 'vite', folder: null },
      { port: 3000, name: 'next dev', folder: 'web' },
    ],
  }
  const visible = [preview('a', 3000, 1), preview('b', 8080, 2)]
  expect(panelPortList(state, visible, [9000, 3000, 8080])).toEqual({
    kind: 'servers',
    servers: [
      { port: 5173, name: 'vite', folder: null },
      { port: 3000, name: 'next dev', folder: 'web' },
      { port: 8080, name: null, folder: null },
      { port: 9000, name: null, folder: null },
    ],
  })
})

it('leaves out each port that a shown service row lists, also a port of a tab, and keeps a port that no row lists', () => {
  const state: PreviewsState = {
    ...loaded,
    ports: [
      { port: 3000, name: 'next dev', folder: null },
      { port: 4321, name: 'astro dev', folder: 'docs' },
    ],
  }
  const visible = [preview('a', 3000, 1)]
  const owned = new Set([3000, 6006])
  expect(panelPortList(state, visible, [6006, 3000, 8080], owned)).toEqual({
    kind: 'servers',
    servers: [
      { port: 4321, name: 'astro dev', folder: 'docs' },
      { port: 8080, name: null, folder: null },
    ],
  })
})

it('shows the field alone without a report, and asks for a server with an empty one', () => {
  expect(panelPortList(loaded, [], [])).toEqual({ kind: 'field' })
  expect(panelPortList({ ...loaded, ports: [] }, [], [])).toEqual({
    kind: 'empty',
  })
  // A tab of a port lists that port also without a report.
  expect(panelPortList(loaded, [], [4000])).toEqual({
    kind: 'servers',
    servers: [{ port: 4000, name: null, folder: null }],
  })
})

it('shows the oldest open preview of a port', () => {
  const visible = [
    preview('newer', 3000, 20),
    preview('other', 6006, 1),
    preview('older', 3000, 10),
  ]
  expect(previewOfPort(visible, 3000)?.id).toBe('older')
  expect(previewOfPort(visible, 4000)).toBeNull()
})
