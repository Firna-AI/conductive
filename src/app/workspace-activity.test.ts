import { describe, expect, test } from 'vitest'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import {
  flushMicrotasks,
  ManualInput,
  requestLines,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const activityPath = workspacePaths.activity(FAKE_IDS.org, FAKE_IDS.workspace)

describe('WorkspaceModel activity', () => {
  test('input on the page counts as activity of the open workspace, at most once a minute, until close', async () => {
    const server = new FakeApiServer()
    const input = new ManualInput()
    let time = FAKE_TIME
    const org = new OrgModel(
      testServices(server, { onInput: input.onInput, now: () => time }),
      FAKE_IDS.org,
    )
    const workspace = new WorkspaceModel(org, FAKE_IDS.workspace)
    const reports = async () => {
      await flushMicrotasks()
      return requestLines(server).filter(
        (line) => line === `POST ${activityPath}`,
      ).length
    }
    await workspace.open()
    input.input()
    time += 59_999
    input.input()
    const inOneMinute = await reports()
    time += 1
    input.input()
    const nextMinute = await reports()
    workspace.close()
    time += 60_000
    input.input()
    expect({
      inOneMinute,
      nextMinute,
      afterClose: await reports(),
      listening: input.listening,
    }).toEqual({ inOneMinute: 1, nextMinute: 2, afterClose: 2, listening: 0 })
  })
})
