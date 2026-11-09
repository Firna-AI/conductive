import { useState } from 'react'
import { SecretSwitch } from '../../../docs/mockups/src/components/settings/EnvVarParts'
import type { ComputerModel } from '../../app/computer-model'
import type { OrgSettings } from '../../shared/org-settings'
import { useAction } from '../ui/useAction'

/** An env var as the settings give it: its name and its Secret mark. */
export type EnvVar = OrgSettings['envVars'][number]

/**
 * The Secret mark of a variable in its row. A change saves the mark at
 * once, without the value. While the write runs, the mark shows its new
 * state. After a failure it shows the saved mark again, and a toast names
 * the variable.
 */
export function useMark(computer: ComputerModel, item: EnvVar) {
  const [target, setTarget] = useState(item.secret)
  const classify = useAction(
    (secret: boolean) => computer.classifyEnvVar(item.name, secret),
    `The Secret mark of ${item.name} was not saved`,
  )
  return {
    shown: classify.pending ? target : item.secret,
    pending: classify.pending,
    set: (secret: boolean) => {
      if (classify.pending) return
      setTarget(secret)
      classify.run(secret)
    },
  }
}

type Mark = ReturnType<typeof useMark>

/** The Secret switch of a row. */
export function MarkSwitch(props: {
  item: EnvVar
  mark: Mark
  disabled: boolean
}) {
  return (
    <SecretSwitch
      disabled={props.disabled}
      label={`Secret value of ${props.item.name}`}
      onValueChange={props.mark.set}
      value={props.mark.shown}
    />
  )
}
