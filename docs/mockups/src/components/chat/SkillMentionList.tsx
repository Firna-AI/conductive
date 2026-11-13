import { MentionList } from './MentionList'
import { SkillIcon } from './SkillChip'
import { skillListCopy } from './skillCopy'
import { skillRows } from './skillMentions'

/**
 * The skills as the list of `/` finds them: the latest report, no report
 * yet, no report from the runner of this start, or a report without a
 * skill.
 */
export type SkillSource = 'latest' | 'loading' | 'unavailable' | 'none'

/**
 * The list of `/` of the mockups, for the query after the last `/` of the
 * draft: the skills of the sample list that match, with the first row
 * highlighted. Each row shows the name and the description of a skill. One
 * line takes the place of the rows while no report has come, when the
 * runner sent none, and, for `/` alone, when the repository has no skills.
 * When no skill matches the query, the list closes, so the text sends as
 * it is.
 */
export function SkillMentionList(props: {
  query: string
  source: SkillSource
}) {
  const rows = props.source === 'latest' ? skillRows(props.query) : []
  let line: string | null = null
  if (props.source === 'loading') line = skillListCopy.loading
  else if (props.source === 'unavailable') line = skillListCopy.unavailable
  else if (props.source === 'none' && props.query === '') {
    line = skillListCopy.none
  }
  if (rows.length === 0 && line === null) return null
  return (
    <MentionList
      highlighted={rows.length > 0 ? 0 : null}
      id="skill-mentions"
      label="Skills"
      line={line}
      rows={rows.map((skill) => ({
        key: skill.name,
        name: skill.name,
        folder: '',
        description: skill.description,
        icon: <SkillIcon size={14} />,
      }))}
    />
  )
}
