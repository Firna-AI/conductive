import { ManualChatClock } from '../chat/chat-clock.test-support'
import { NATIVE_TEST_TIME } from './native-workspace-api'

export function nativeClock() {
  const clock = new ManualChatClock(NATIVE_TEST_TIME)
  let offset = 0
  const now = () => clock.now() + offset
  return {
    now,
    schedule: clock.schedule,
    scheduledCount: () => clock.scheduledCount,
    setTime: async (at: number) => {
      if (at < now()) offset = at - clock.now()
      else await clock.advance(at - now())
    },
  }
}
