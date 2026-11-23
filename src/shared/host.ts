import type { HostPath } from './generated/HostPath'
import type { HostStreamPort } from './generated/HostStreamPort'

export const HOST_PROTOCOL_VERSION = 1
export const HOST_PATH: HostPath = '/v1/host'
export const HOST_MESSAGE_PART_BYTES = 262_144
export const HOST_STREAM_FRAME_BYTES = 65_536
export const HOST_STREAM_WINDOW_BYTES = 262_144
export const HOST_REQUEST_MAX_BYTES = 4_194_304
export const HOST_REPLY_MAX_BYTES = 1_048_576
export const HOST_COMMAND_REPLY_MAX_BYTES = 18_874_368
export const HOST_FILE_READ_MAX_BYTES = 5_242_880
export const HOST_MAX_PENDING_REQUESTS = 64
export const HOST_MAX_OPEN_STREAMS = 64
export const HOST_CLOSE_REPLACED = 4001
export const HOST_CLOSE_TOKEN_CHANGED = 4003
export const HOST_CLOSE_UNSUPPORTED_VERSION = 4400
export const HOST_PING_SECONDS = 25
export const HOST_STREAM_PORTS: readonly HostStreamPort[] = [7681, 7682]
