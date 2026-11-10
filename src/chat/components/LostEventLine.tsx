import type { RunnerEventRefused } from '../../shared/chat-events'
import { LostLine } from '../../../docs/mockups/src/components/chat/LostLine'
import { lostData } from '../../shared/transcript/lost-data'

/**
 * The one line of a refused runner event of a session (decision 76). It
 * names the lost data and the reason in plain words, and shows no part of
 * the marker itself, such as its stream or its event number. The chat
 * centres it. Among the steps of an open work fold, it starts at the left
 * edge, with `align="start"`.
 */
export function LostEventLine(props: {
  marker: RunnerEventRefused
  align?: 'center' | 'start'
}) {
  const { marker } = props
  return (
    <LostLine
      align={props.align}
      reason={marker.reason}
      what={lostData[marker.runnerEventType]}
    />
  )
}
