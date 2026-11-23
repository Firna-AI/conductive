import { defineComponent } from '@mokly/mokly'
import { NewWorkspaceDialog } from '../../../components/new-workspace/NewWorkspaceDialog'
import { defaultChoice } from '../../../fixtures/agents'
import {
  firstMessageAttachments,
  firstMessageBeforeDrop,
  firstMessageDraft,
  firstMessageDrafts,
} from '../../../fixtures/attachments'
import { repositories } from '../../../fixtures/repositories'
import { sections } from '../../../fixtures/sections'
import { withPanel } from '../chat/capabilitiesSlot'
import { capabilitiesSchema, sessionLoginSchema } from '../chat/composerSchemas'
import { menuSchema, type MenuEntryData } from '../common/menuEntries'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/** An attached file of a message as JSON, as `Attachment`. */
const attachmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'kind', 'sizeBytes', 'path'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    kind: { enum: ['image', 'file'] },
    sizeBytes: { type: 'integer', minimum: 0 },
    /** The copy path that the upload gives. */
    path: { type: 'string' },
    tab: { const: 'picture' },
    /** The upload still runs, or it failed. */
    state: { enum: ['uploading', 'failed'] },
    sentBytes: { type: 'integer', minimum: 0 },
  },
} as const

/** The sections of Acme, with General checked. */
const sectionMenu: readonly MenuEntryData[] = Object.values(sections).map(
  (section) => ({
    kind: 'item',
    label: section.name,
    checked: section.key === 'general',
  }),
)

/** The chosen repositories of Acme, with the first one checked. */
const repositoryMenu: readonly MenuEntryData[] = Object.values(
  repositories,
).map((repository) => ({
  kind: 'item',
  label: repository.name,
  checked: repository.key === 'storefront',
}))

/**
 * The New workspace dialog, drawn open, registered with Mokly. The page
 * supplies its notices, the open Capabilities control, and the branch
 * control right of the repository picker in slots.
 */
export const newWorkspaceDialog = defineComponent({
  slug: 'new-workspace-dialog',
  title: 'New workspace dialog',
  description:
    'New workspace as a wide, compact dialog over the dimmed app, for a computer: the repository picker and the branch control close right of it at the top left, with no chevrons and only a muted branch icon on the default branch, the section at the top right, the message in the middle with a chip for each of its files, and the model picker, the label of the org login when the first message runs on it, the Capabilities icon, the attach button, and Create at the bottom. The whole card takes a drop of files. The page supplies its notices, which show above the footer. Its own page shows the dialog as it opens.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'section',
      'text',
      'attachments',
      'placeholder',
      'choice',
      'ready',
    ],
    properties: {
      /** The chosen repository, or none while the org has chosen none. */
      repository: { type: 'string' },
      repositoryMenu: menuSchema.properties.entries,
      /** The org and the section that the new workspace joins. */
      section: { type: 'string' },
      sectionMenu: menuSchema.properties.entries,
      /** The message, with a chip for each of its files at its place. */
      text: { type: 'string' },
      attachments: { type: 'array', items: attachmentSchema },
      /** Files hover over the dialog. */
      drop: { type: 'boolean' },
      /** The caret at this index of the text, such as the drop caret. */
      caret: { type: 'integer', minimum: 0 },
      placeholder: { type: 'string' },
      choice: agentChoiceSchema,
      /** The message can go, so Create is on once each file is uploaded. */
      ready: { type: 'boolean' },
      /** The login of the first message, when it is not the own login. */
      login: sessionLoginSchema,
      /** The Capabilities icon beside the attach button. */
      capabilities: capabilitiesSchema,
    },
  } as const,
  slots: ['notices', 'capabilitiesPanel', 'branch'],
  props: {
    repository: repositories.storefront.name,
    section: sections.general.name,
    text: '',
    attachments: [],
    placeholder: 'Describe the task',
    choice: defaultChoice,
    ready: false,
  },
  render: (props) => (
    <NewWorkspaceDialog
      attachments={props.attachments}
      branch={props.branch}
      capabilities={withPanel(props.capabilities, props.capabilitiesPanel)}
      caret={props.caret}
      choice={props.choice}
      drop={props.drop}
      login={props.login}
      notices={props.notices}
      placeholder={props.placeholder}
      ready={props.ready}
      repository={props.repository}
      repositoryMenu={props.repositoryMenu}
      section={props.section}
      sectionMenu={props.sectionMenu}
      text={props.text}
    />
  ),
  variants: [
    {
      slug: 'draft',
      title: 'Message ready',
      description:
        'A message with a chip for each of its two files at its place: Create is on.',
      props: {
        text: firstMessageDraft,
        attachments: firstMessageAttachments,
        ready: true,
      },
    },
    {
      slug: 'repository-menu',
      title: 'Repository menu',
      description: 'The chosen repositories below the picker.',
      props: { repositoryMenu },
    },
    {
      slug: 'section-menu',
      title: 'Section menu',
      description: 'The sections of the org below the picker of the section.',
      props: { sectionMenu },
    },
    {
      slug: 'drop',
      title: 'Drop',
      description:
        'A file over the dialog: its full border shows the drop state, with the caret where it lands.',
      props: {
        text: firstMessageBeforeDrop.draft,
        attachments: firstMessageDrafts['drop-over'],
        caret: firstMessageBeforeDrop.caret,
        drop: true,
      },
    },
  ],
})
