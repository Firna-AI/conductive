/**
 * The notices of a device: off in the settings of the device after a
 * denial, off after Not now, or on. This module draws nothing, so a state
 * or a registration can read it without the styles of the Notices section.
 */
export const noticeSettings = ['denied', 'not-now', 'on'] as const

export type NoticeSetting = (typeof noticeSettings)[number]
