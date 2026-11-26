import { defineComponent } from '@mokly/mokly'
import { LinkTabs, type LinkTab } from '../../../components/common/LinkTabs'
import { paths } from '../../../paths'

/** A tab as JSON, with the fields of `LinkTab`. */
const tabSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'selected'],
  properties: {
    label: { type: 'string' },
    /** The screen of the tab. A tab whose screen the mockups lack has none. */
    to: { type: 'string' },
    /** A count after the label, such as the number of changed files. */
    count: { type: 'number' },
    /** The tooltip and the spoken name of a tab whose label is cut. */
    title: { type: 'string' },
    selected: { type: 'boolean' },
  },
} as const

/** The tabs of the org settings, with Members open. */
const settingsTabs = [
  { label: 'General', to: paths.orgSettings, selected: false },
  { label: 'Repositories', to: paths.repositories, selected: false },
  { label: 'Cloud computer', to: paths.cloudComputer, selected: false },
  { label: 'Members', to: paths.members, selected: true },
] satisfies readonly LinkTab[]

/**
 * A row of tabs that are links, registered with Mokly. Its pages show a
 * row with a count, the three columns of a phone, and a row that flows
 * onto a second line.
 */
export const linkTabs = defineComponent({
  slug: 'link-tabs',
  title: 'Link tabs',
  description:
    'A row of tabs, where each tab is a link to the screen that shows it, with an optional count after its label. A row can put its tabs in three columns, or keep them on one line while they fit and move the rest to a second line. Its own page shows the Files tabs with the count of changed files.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'tabs'],
    properties: {
      label: { type: 'string' },
      tabs: { type: 'array', items: tabSchema },
      /** The tabs fill a grid of three columns. */
      wrap: { type: 'boolean' },
      /** The tabs keep one line while they fit, and the rest flows on. */
      flow: { type: 'boolean' },
      /** The row clips tabs at its end, with a fade. */
      fadeEnd: { type: 'boolean' },
    },
  } as const,
  props: {
    label: 'Files',
    tabs: [
      { label: 'All files', to: paths.filesAll, selected: false },
      { label: 'Changes', to: paths.filesChanges, count: 5, selected: true },
    ],
  },
  render: (props) => (
    <LinkTabs
      fadeEnd={props.fadeEnd}
      flow={props.flow}
      label={props.label}
      tabs={props.tabs}
      wrap={props.wrap}
    />
  ),
  variants: [
    {
      slug: 'wrap',
      title: 'Three columns',
      description: 'The tabs of the org settings on a phone, in three columns.',
      props: { label: 'Org settings', tabs: settingsTabs, wrap: true },
    },
    {
      slug: 'flow',
      title: 'Flowing row',
      description:
        'The tabs of the org settings keep one line while they fit, and the rest moves to a second line.',
      props: { label: 'Org settings', tabs: settingsTabs, flow: true },
    },
  ],
})
