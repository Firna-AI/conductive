import { expect, it } from 'vitest'
import type { WorkspaceView } from './workspace-view'
import { viewFromWire, viewToWire } from './workspace-view-wire'

const session = { kind: 'session', sessionId: 'one' } as const
const file = { kind: 'file', path: 'a.ts', mode: 'source' } as const
const view: WorkspaceView = {
  tabs: [session, { kind: 'preview', port: 3000 }, file],
  activeTab: { kind: 'preview', port: 3000 },
  temporaryTab: null,
  fileList: 'all',
  tool: 'preview',
}

it('keeps the place of each Preview tab through the shape of the route', () => {
  const wire = viewToWire(view)
  expect(wire).toMatchObject({
    tabs: [session, file],
    activeTab: null,
    previewTabs: [{ port: 3000, place: 1 }],
    activePreview: 3000,
  })
  expect(
    viewFromWire(wire, wire.previewTabs ?? [], wire.activePreview ?? null),
  ).toEqual(view)
})

it('puts a Preview tab past the end of a shorter row at its end, and keeps one tab for each port', () => {
  const back = viewFromWire(
    { ...viewToWire(view), tabs: [session] },
    [
      { port: 3000, place: 5 },
      { port: 3000, place: 0 },
    ],
    null,
  )
  expect(back.tabs).toEqual([{ kind: 'preview', port: 3000 }, session])
  expect(back.activeTab).toBeNull()
})
