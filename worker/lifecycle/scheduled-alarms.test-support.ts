export interface AlarmClock {
  now(): number
  setTime(at: number): void | Promise<void>
}

export interface ScheduledAlarm {
  storage: {
    getAlarm(): Promise<number | null>
    deleteAlarm(): Promise<void>
  }
  fire(): Promise<void>
}

export async function advanceScheduledAlarms(
  clock: AlarmClock,
  at: number,
  alarms: () => readonly ScheduledAlarm[],
): Promise<number> {
  await clock.setTime(at)
  let fired = 0
  while (true) {
    const saved = await Promise.all(
      alarms().map(async (alarm) => ({
        alarm,
        at: await alarm.storage.getAlarm(),
      })),
    )
    const due = saved
      .filter((entry) => entry.at !== null && entry.at <= clock.now())
      .sort((left, right) => (left.at ?? Infinity) - (right.at ?? Infinity))[0]
    if (!due) return fired
    await due.alarm.storage.deleteAlarm()
    await due.alarm.fire()
    fired++
  }
}
