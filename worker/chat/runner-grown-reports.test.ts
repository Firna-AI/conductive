import { expect, it } from 'vitest'

import { FILE_EVENT_MAX_BYTES } from '../../src/shared/files'
import { jsonBytes } from '../../src/shared/event-limits'
import { FilesState } from '../files/state'
import {
  capStorageValues,
  completeReport,
  createGrownReportsFixture,
  reportPart,
} from './runner-grown-reports.test-support'

it.each(['tree', 'changes'] as const)(
  'confirms grown %s parts and restores the complete labeled report across reconnects',
  async (kind) => {
    const fixture = await createGrownReportsFixture()
    capStorageValues(fixture.storage)
    const first = reportPart(kind, 1)
    const last = reportPart(kind, 2)
    expect(jsonBytes(first)).toBeLessThanOrEqual(FILE_EVENT_MAX_BYTES)
    expect(jsonBytes(last)).toBeLessThanOrEqual(FILE_EVENT_MAX_BYTES)
    await expect(fixture.receive(1, first)).resolves.toBeUndefined()
    expect(fixture.published).toEqual([])
    expect(fixture.sent.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'stream',
      throughEventNumber: 1,
    })
    await fixture.connect('stream', true)
    await fixture.receive(2, first)
    await fixture.receive(3, last)
    const event = completeReport(kind)
    expect(fixture.published.map((envelope) => envelope.event)).toEqual([event])
    expect(fixture.hooks).toEqual(fixture.published)
    await fixture.connect('stream', true)
    expect(await fixture.history()).toEqual({
      events: fixture.published,
      throughEventNumber: 1,
    })
    const projection = await fixture.read(async (view) => {
      const files = new FilesState(view.files)
      return kind === 'tree' ? files.tree() : files.changes()
    })
    expect(projection).toEqual(
      event.type === 'files.snapshot'
        ? event.tree
        : event.type === 'changes.updated'
          ? event.changes
          : null,
    )
    expect(fixture.sent.at(-1)).toMatchObject({
      type: 'welcome',
      confirmedThrough: 3,
    })
  },
)
