import { expect, test } from 'vitest'
import { detectShortcutHost } from './host'

test('detects installed Chromium hosts without treating Safari or Firefox web apps as installed', () => {
  const cases = [
    [
      'Macintosh Chrome/157 Safari/537',
      'standalone',
      { kind: 'installed-app', browser: 'chrome', system: 'mac' },
    ],
    [
      'Windows Chrome/157 Edg/157',
      'window-controls-overlay',
      { kind: 'installed-app', browser: 'edge', system: 'windows' },
    ],
    [
      'Linux Firefox/159',
      'standalone',
      { kind: 'browser-tab', browser: 'firefox', system: 'linux' },
    ],
    [
      'Macintosh Version/26 Safari/626',
      'standalone',
      { kind: 'browser-tab', browser: 'safari', system: 'mac' },
    ],
    [
      'Windows Chrome/157 Safari/537',
      'browser',
      { kind: 'browser-tab', browser: 'chrome', system: 'windows' },
    ],
    [
      'Android Chrome/157 Safari/537',
      'browser',
      { kind: 'browser-tab', browser: 'chrome', system: 'linux' },
    ],
    [
      'Unknown browser',
      'browser',
      { kind: 'browser-tab', browser: 'unknown', system: 'unknown' },
    ],
  ] as const
  for (const [agent, mode, expected] of cases) {
    expect(detectShortcutHost(agent, mode), agent).toEqual(expected)
  }
})
