import { useEffect, useMemo, useState } from 'react'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, tokensCss } from '../../../docs/mockups/src/theme'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { GitHubViewer } from '../archive'
import { ChecksList } from '../ChecksList'
import { PullRequestBar } from '../PullRequestBar'
import { PullRequestRow } from '../PullRequestRow'
import { useGitHubState } from '../useGitHubState'
import { DevControls } from './DevControls'
import { optionsQuery, readOptions, type DevOptions } from './devOptions'
import { createDevSource, type DevSource } from './devSource'
import styles from './DevPage.module.css'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }
const workspace = workspaceFixtures().detail.workspace
const viewers: Readonly<Record<DevOptions['viewer'], GitHubViewer>> = {
  owner: { id: workspace.owner.id, role: 'member' },
  admin: { id: fakeUsers[1].id, role: 'admin' },
  member: { id: fakeUsers[2].id, role: 'member' },
}

/** The desktop right column and the phone, both against the fake API. */
function Preview(props: {
  source: DevSource
  viewer: GitHubViewer
  onArchive: () => void
}) {
  const { fetch, subscribe, delay } = props.source
  const github = useGitHubState(target, { fetch, subscribe, delay })
  return (
    <div className={styles.frames}>
      <section aria-label="Desktop right column">
        <p className={styles.frameLabel}>Desktop right column</p>
        <div className={styles.column}>
          <PullRequestBar
            github={github}
            now={FAKE_TIME}
            onArchive={props.onArchive}
            viewer={props.viewer}
            workspace={workspace}
          />
          <div className={styles.tabs}>
            <span className={styles.tab}>Checks</span>
          </div>
          <ChecksList github={github} />
        </div>
      </section>
      <section aria-label="Phone">
        <p className={styles.frameLabel}>Phone</p>
        <div className={styles.phone}>
          <PullRequestRow checksHref="#phone-checks" github={github} />
          <div className={styles.phoneChecks} id="phone-checks">
            <ChecksList github={github} />
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * The development page of the GitHub banner. It serves at
 * /src/github/dev/index.html with `npm run dev`, and no app route mounts it.
 */
export function DevPage() {
  const [options, setOptions] = useState(() => readOptions(location.search))
  const [note, setNote] = useState('')
  const source = useMemo(
    () => createDevSource(options.state, options.github, options.sample),
    [options.state, options.github, options.sample],
  )
  useEffect(() => {
    history.replaceState(null, '', optionsQuery(options))
  }, [options])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: domBackendCss }} />
      <style dangerouslySetInnerHTML={{ __html: tokensCss(options.scheme) }} />
      <SharedUiThemeProvider theme={themeFor(options.scheme)}>
        <main className={styles.page}>
          <DevControls
            note={note}
            onChange={(next) => {
              setNote('')
              setOptions(next)
            }}
            onEmit={(state) => {
              source.emit(state)
              setNote(`Sent a live event: ${state}`)
            }}
            onRecover={() => {
              source.recover()
              setNote('The next load succeeds. Press Try again.')
            }}
            options={options}
          />
          <Preview
            key={`${options.state}-${options.github}-${options.sample}`}
            onArchive={() => setNote('Archive opens the app’s Archive flow.')}
            source={source}
            viewer={viewers[options.viewer]}
          />
        </main>
      </SharedUiThemeProvider>
    </>
  )
}
