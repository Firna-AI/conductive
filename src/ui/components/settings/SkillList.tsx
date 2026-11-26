import { SectionText } from './Section'
import { skillCount, skillsCopy as copy } from './skillsCopy'
import styles from './SkillList.module.css'

/**
 * The skills that the lookup found in the saved repository: their number,
 * as the label of a field, then the name of each skill folder, in the name
 * order of the lookup. `incomplete` adds the note of a file tree that
 * GitHub cut short. A cut tree can hold no skill, and then only the note
 * shows, because the skills can lie after the cut.
 */
export function SkillList(props: {
  skills: readonly string[]
  incomplete?: boolean
}) {
  const { skills } = props
  return (
    <div className={styles.skills}>
      {skills.length > 0 ? (
        <>
          <p className={styles.count}>{skillCount(skills.length)}</p>
          <ul aria-label={copy.list} className={styles.list}>
            {skills.map((name) => (
              <li className={styles.skill} key={name}>
                {name}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {props.incomplete ? (
        <SectionText muted>{copy.incomplete}</SectionText>
      ) : null}
    </div>
  )
}
