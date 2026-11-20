import { defineComponent } from '@mokly/mokly'
import { TabBody } from '../../../screens/orgSettingsTabs'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../screens/orgSettingsState'
import { viewports } from '../common/viewports'

/** The body of the open tab of the org settings, registered with Mokly. */
export const tabBody = defineComponent({
  slug: 'tab-body',
  title: 'Tab body',
  description:
    'The body of the open tab of the org settings in a state: General with the org and Delete org, Repositories with the repository notice and the chosen repositories in their order, with Edit, or the whole list while an admin edits it, Cloud computer, or Members. A member who is not an admin, and everyone in a suspended org, reads the settings without edit fields and actions. Its own page shows General of Acme for an admin.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: {
      /** The state of the org settings, as `OrgSettingsState`. */
      state: orgSettingsSchema,
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { state: acmeSettings },
  render: (props, context) => (
    <TabBody
      state={props.state}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'repositories',
      title: 'Repositories',
      description:
        'The Repositories tab after an added repository, whose notice offers Build computer.',
      props: {
        state: {
          ...acmeSettings,
          tab: 'repositories',
          repositoryChange: 'added',
        },
      },
    },
    {
      slug: 'computer',
      title: 'Cloud computer',
      description: 'The Cloud computer tab while a build runs.',
      props: { state: { ...acmeSettings, tab: 'computer', build: 'building' } },
    },
    {
      slug: 'members',
      title: 'Members',
      description: 'The Members tab for an admin.',
      props: { state: { ...acmeSettings, tab: 'members' } },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'General of a suspended org, read-only, with Leave org for a member whom the last-admin rule lets leave.',
      props: {
        state: { ...acmeSettings, org: 'suspended', viewer: 'member' },
      },
    },
  ],
})
