import { defineComponent } from '@mokly/mokly'
import { ShortcutIntro } from '../../../components/settings/ShortcutIntro'
import { shortcutHosts } from '../common/shortcutSchemas'
import { chromePages } from './shortcutRowSchemas'

/** The lines above the groups of Keyboard shortcuts, registered with Mokly. */
export const shortcutIntro = defineComponent({
  slug: 'shortcut-intro',
  title: 'Shortcut intro',
  description:
    'The lines above the groups of the Keyboard shortcuts tab: how to change a shortcut, the keys that the terminal keeps, and in a normal browser tab, where the dimmed keys work. Reset all follows them after a change, and the error of a failed Reset all stands under them. Its own page shows a normal Chrome tab on a Mac.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['host', 'changed'],
    properties: {
      /** Where the app runs, which sets the keys of the lines. */
      host: { enum: shortcutHosts },
      /** A command has a change, so Reset all shows. */
      changed: { type: 'boolean' },
      /** The save of Reset all failed, so the changes stay. */
      resetAllFailed: { type: 'boolean' },
      /** The question before Reset all, when the catalogue draws it. */
      resetAllTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { host: 'chrome-mac', changed: false },
  render: (props) => (
    <ShortcutIntro
      changed={props.changed}
      host={props.host}
      resetAllFailed={props.resetAllFailed}
      resetAllTo={props.resetAllTo}
    />
  ),
  variants: [
    {
      slug: 'changed',
      title: 'Changed',
      description: 'A change: Reset all, which asks first.',
      props: {
        changed: true,
        ...(chromePages.resetAll ? { resetAllTo: chromePages.resetAll } : {}),
      },
    },
    {
      slug: 'reset-all-failed',
      title: 'Reset all failed',
      description:
        'A Reset all that failed: its error across the width of the tab.',
      props: { changed: true, resetAllFailed: true },
    },
    {
      slug: 'windows',
      title: 'Windows',
      description:
        'A normal Chrome tab on Windows: every key goes to the terminal.',
      props: { host: 'chrome-windows' },
    },
    {
      slug: 'mac-app',
      title: 'Mac app',
      description: 'The Mac app, which keeps no key: no line of dimmed keys.',
      props: { host: 'mac-app' },
    },
  ],
})
