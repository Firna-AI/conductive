import { Input } from '@firna/ui/input'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { DetailList } from './DetailList'
import type { ReadOnlyCause } from './OrgSections'
import { Section, SectionText } from './Section'
import { skillsCopy as copy } from './skillsCopy'

/**
 * The field of an admin. It takes owner/name or a link from GitHub, and
 * Save stores owner/name.
 */
function RepositoryField(props: { value: string }) {
  const { field } = useControlSizes()
  return (
    <Input
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect={false}
      hint={copy.hint}
      label={copy.label}
      onChangeText={noop}
      placeholder={copy.placeholder}
      size={field}
      spellCheck={false}
      value={props.value}
    />
  )
}

/**
 * The GitHub repository whose skills the agents of every workspace of the
 * org use. Only an admin changes it, for the reason of decision 57: it
 * changes the work of every agent of the org. `repository` is the
 * saved owner/name, or none for an org without one, such as a new org.
 * `draft` is the text of the field when an admin changed it and has not
 * saved, such as a pasted link. Save repository waits for a change.
 * `readOnly` shows the saved repository as text, without the field and
 * Save, for a member who is not an admin and in a suspended org.
 */
export function SkillsSection(props: {
  repository?: string
  draft?: string
  readOnly?: ReadOnlyCause
}) {
  const saved = props.repository ?? ''
  if (props.readOnly) {
    return (
      <Section description={copy.description} title={copy.title}>
        {saved ? (
          <DetailList rows={[{ term: copy.label, value: saved }]} />
        ) : (
          <SectionText muted>{copy.empty[props.readOnly]}</SectionText>
        )}
      </Section>
    )
  }
  const value = props.draft ?? saved
  return (
    <Section
      actions={
        <ActionButton disabled={value === saved}>{copy.save}</ActionButton>
      }
      description={copy.description}
      title={copy.title}
    >
      <RepositoryField value={value} />
    </Section>
  )
}
