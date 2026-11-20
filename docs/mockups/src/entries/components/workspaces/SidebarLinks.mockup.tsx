import { defineComponent } from '@mokly/mokly'
import {
  NewWorkspaceLink,
  AutomationsLink,
  SearchLink,
  SettingsLink,
} from '../../../components/workspaces/SidebarLinks'
import { shortcutSchema } from '../common/shortcutSchemas'

/** A screen of the catalogue that a link opens. */
const toSchema = { type: 'string', minLength: 1 } as const

/** Where a link of the org sits: the desktop sidebar, or the list page. */
const linkVariant = { enum: ['sidebar', 'page'] } as const

/** The cog of the org settings, registered with Mokly. */
export const settingsLink = defineComponent({
  slug: 'settings-link',
  title: 'Settings link',
  description:
    'The cog beside the name of the org that links to its settings. Its tooltip and its hidden text say Settings. A dot says that something there needs the user, such as a failed build of the cloud computer. Its own page shows the cog of the list.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The settings are the current page. */
      current: { type: 'boolean' },
      /** A build of the cloud computer failed. */
      alert: { type: 'boolean' },
      /** The page of the settings, such as those of a suspended org. */
      to: toSchema,
    },
  } as const,
  render: (props) => (
    <SettingsLink alert={props.alert} current={props.current} to={props.to} />
  ),
  variants: [
    {
      slug: 'current',
      title: 'Current page',
      description: 'The cog while the main area shows the settings.',
      props: { current: true },
    },
    {
      slug: 'alert',
      title: 'Build failed',
      description: 'The dot after a failed build of the cloud computer.',
      props: { alert: true },
    },
  ],
})

/** The props of a link to a page of the org. */
const pageLinkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['variant'],
  properties: {
    current: { type: 'boolean' },
    variant: linkVariant,
    to: toSchema,
  },
} as const

/** The row at the top of the list that starts a workspace, registered with Mokly. */
export const newWorkspaceLink = defineComponent({
  slug: 'new-workspace-link',
  title: 'New workspace link',
  description:
    'The row at the top of the workspace list that opens New workspace, with a plus. The sidebar uses a compact row, and the list page a taller row for touch. Its own page shows the row of the sidebar.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: pageLinkSchema,
  props: { variant: 'sidebar' },
  render: (props) => (
    <NewWorkspaceLink
      current={props.current}
      to={props.to}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'current',
      title: 'Current page',
      description: 'The row while the main area shows New workspace.',
      props: { current: true },
    },
    {
      slug: 'page',
      title: 'On the list page',
      description: 'The taller row of the list page.',
      props: { variant: 'page' },
    },
  ],
})

/** The row below New workspace that opens the automations, registered with Mokly. */
export const automationsLink = defineComponent({
  slug: 'automations-link',
  title: 'Automations link',
  description:
    'The row below New workspace that opens the automations of the org. A suspended org keeps it. Its own page shows the row of the sidebar.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: pageLinkSchema,
  props: { variant: 'sidebar' },
  render: (props) => (
    <AutomationsLink
      current={props.current}
      to={props.to}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'current',
      title: 'Current page',
      description: 'The row while the main area shows the automations.',
      props: { current: true },
    },
    {
      slug: 'page',
      title: 'On the list page',
      description: 'The taller row of the list page.',
      props: { variant: 'page' },
    },
  ],
})

/** The row that opens the command palette, registered with Mokly. */
export const searchLink = defineComponent({
  slug: 'search-link',
  title: 'Search link',
  description:
    'The row under New workspace that opens the command palette. A desktop shows its key, so the row teaches it. A phone has no key to show. In the Mac app the row opens the palette of the Mac app. Its own page shows the row of the list page of a phone, without a key.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['variant'],
    properties: {
      variant: linkVariant,
      /** The key that opens the palette, such as ⌘K, or none. */
      shortcut: shortcutSchema,
    },
  } as const,
  props: { variant: 'page' },
  render: (props) => (
    <SearchLink shortcut={props.shortcut} variant={props.variant} />
  ),
  variants: [
    {
      slug: 'sidebar',
      title: 'In the sidebar',
      description:
        'The compact row of the sidebar, with the key of the palette.',
      props: { variant: 'sidebar', shortcut: ['⌘', 'K'] },
    },
  ],
})
