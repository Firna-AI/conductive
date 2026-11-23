import { defineComponent } from '@mokly/mokly'
import {
  SecretMark,
  SecretSwitch,
  ValueDots,
} from '../../../../../../src/ui/components/settings/EnvVarParts'
import { noop } from '../../../../../../src/ui/noop'

/**
 * The Secret mark of a variable as a switch, registered with Mokly. A
 * change saves at once, so the switch gets `noop`.
 */
export const secretSwitch = defineComponent({
  slug: 'secret-switch',
  title: 'Secret switch',
  description:
    'The Secret mark of an env var as a switch with its visible label, which an admin switches in the row of the variable. Its spoken name names the variable, so the visible word is hidden from assistive technology. Its own page shows a secret variable.',
  relatedDocs: ['docs/mockups/README.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'value'],
    properties: {
      /** The spoken name, such as "Secret value of DATABASE_URL". */
      label: { type: 'string' },
      value: { type: 'boolean' },
      disabled: { type: 'boolean' },
    },
  } as const,
  props: { label: 'Secret value of DATABASE_URL', value: true },
  render: (props) => (
    <SecretSwitch
      disabled={props.disabled}
      label={props.label}
      onValueChange={noop}
      value={props.value}
    />
  ),
  variants: [
    {
      slug: 'off',
      title: 'Not secret',
      description: 'A variable that is not secret.',
      props: { label: 'Secret value of NEXT_PUBLIC_SITE_URL', value: false },
    },
    {
      slug: 'disabled',
      title: 'Off',
      description: 'A switch that takes no change.',
      props: { disabled: true },
    },
  ],
})

/** The Secret mark without a control, registered with Mokly. */
export const secretMark = defineComponent({
  slug: 'secret-mark',
  title: 'Secret mark',
  description:
    'The Secret mark of an env var as a word with a lock, for a member who may not change it. A variable that is not secret leaves the place empty, so the values of the rows stay in line. Its own page shows a secret variable.',
  relatedDocs: ['docs/mockups/README.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['secret'],
    properties: { secret: { type: 'boolean' } },
  } as const,
  props: { secret: true },
  render: (props) => <SecretMark secret={props.secret} />,
  variants: [
    {
      slug: 'not-secret',
      title: 'Not secret',
      description: 'A variable that is not secret: an empty place.',
      props: { secret: false },
    },
  ],
})

/** Dots in the place of a value, registered with Mokly. */
export const valueDots = defineComponent({
  slug: 'value-dots',
  title: 'Value dots',
  description:
    'Dots in the place of the value of an env var, which no screen shows. Assistive technology hears "Value set".',
  relatedDocs: ['docs/mockups/README.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <ValueDots />,
})
