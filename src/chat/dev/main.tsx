import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, tokensCss } from '../../../docs/mockups/src/theme'
import '../../../docs/mockups/src/render.css'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import type { Clock } from '../ui/clock'
import { DevBackend } from './dev-backend'
import { readOptions } from './dev-options'
import { DevPage } from './DevPage'

/**
 * The clock of the page: the fake data's time plus the time since the page
 * loaded, so a recorded running turn shows 2m 41s, as its mockup does. A
 * frozen clock keeps every time still for screenshots.
 */
function pageClock(frozen: boolean): Clock {
  const base = FAKE_TIME + 161_000
  const loaded = performance.now()
  return { now: () => (frozen ? base : base + performance.now() - loaded) }
}

const options = readOptions(window.location.search)
const clock = pageClock(options.clock === 'frozen')
const backend = await DevBackend.create(options, clock)
const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <style>{domBackendCss}</style>
      <style>{tokensCss(options.scheme)}</style>
      <SharedUiThemeProvider theme={themeFor(options.scheme)}>
        <DevPage backend={backend} clock={clock} options={options} />
      </SharedUiThemeProvider>
    </StrictMode>,
  )
}
