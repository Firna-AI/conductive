import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import {
  IDLE_STOP_CHOICES,
  type IdleStopMinutes,
} from '../../../shared/operator-idle-stop'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { stopTimeLabel, stopTimeWords } from './stopTimeCopy'

const options: SegmentOption<string>[] = IDLE_STOP_CHOICES.map((minutes) => ({
  label: stopTimeLabel(minutes),
  value: String(minutes),
}))

/**
 * The stop time of idle cloud computers, one of the fixed choices of the
 * operator. The options wrap onto more lines when they do not fit, as on a
 * phone. `disabled` turns the choice off, such as while a save runs. It
 * imports no fixture, so the app uses it too.
 */
export function StopTimeChoice(props: {
  value: IdleStopMinutes
  onChange?: (minutes: IdleStopMinutes) => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  const onChange = props.onChange
  return (
    <SegmentedControl
      disabled={props.disabled}
      label={stopTimeWords.label}
      onChange={
        onChange
          ? (value) => {
              const minutes = IDLE_STOP_CHOICES.find(
                (choice) => String(choice) === value,
              )
              if (minutes !== undefined) onChange(minutes)
            }
          : noop
      }
      options={options}
      size={field}
      value={String(props.value)}
      wrap
    />
  )
}
