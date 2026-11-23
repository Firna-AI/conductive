import { defineComponent } from '@mokly/mokly'
import { DetailList } from '../../../../../../src/ui/components/settings/DetailList'
import { OrgColorValue } from '../../../../../../src/ui/components/settings/OrgColorField'
import { ORG_COLORS } from '../../../../../../src/ui/design/orgColors'
import { orgPages } from '../../../fixtures/operatorPages'
import { orgs } from '../../../fixtures/orgs'

/**
 * One fact as JSON, as `Detail` with a value of text, or the colour of an
 * org, which shows as its swatch and its name. Another value that holds a
 * part, such as a code with its Copy button, is not data, so the uses with
 * such a value keep the plain list.
 */
const detailSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['term', 'value'],
      properties: {
        term: { type: 'string' },
        value: { type: 'string' },
        /** The value is code, such as an ID. */
        mono: { type: 'boolean' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['term', 'color'],
      properties: {
        term: { type: 'string' },
        /** The colour of an org, as its swatch and its name. */
        color: { enum: ORG_COLORS },
      },
    },
  ],
} as const

const hexwave = orgPages.active

/** Facts as rows of a term and its value, registered with Mokly. */
export const detailList = defineComponent({
  slug: 'detail-list',
  title: 'Detail list',
  description:
    'Facts as rows of a term and its value, in a box with a full outline, such as the read-only name of an org or the details of a user for the operator. A value can show as code, or as the swatch and the name of the colour of an org. Its own page shows the name and the initials of Acme, as a member reads them.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['rows'],
    properties: { rows: { type: 'array', items: detailSchema } },
  } as const,
  props: {
    rows: [
      { term: 'Name', value: orgs.acme.name },
      { term: 'Initials', value: orgs.acme.initials },
    ],
  },
  render: (props) => (
    <DetailList
      rows={props.rows.map((row) =>
        'color' in row
          ? { term: row.term, value: <OrgColorValue value={row.color} /> }
          : row,
      )}
    />
  ),
  variants: [
    {
      slug: 'code',
      title: 'With code',
      description:
        'A value that shows as code among plain ones, such as the ID of an org for the operator.',
      props: {
        rows: [
          { term: 'Org ID', value: hexwave.id, mono: true },
          { term: 'Created', value: hexwave.created },
          { term: 'Repositories', value: String(hexwave.repositories) },
        ],
      },
    },
    {
      slug: 'colour',
      title: 'Org colour',
      description:
        'The details of an org as a member reads them, with the colour of the org as its swatch and its name.',
      props: {
        rows: [
          { term: 'Name', value: orgs.acme.name },
          { term: 'Initials', value: orgs.acme.initials },
          { term: 'Colour', color: 'blue' },
        ],
      },
    },
  ],
})
