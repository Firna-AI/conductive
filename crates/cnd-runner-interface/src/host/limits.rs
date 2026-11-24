//! Host connection version, path, transport limits, and close codes.

/// Current host protocol version, independent of the runner protocol.
pub const HOST_PROTOCOL_VERSION: u8 = 1;
/// Machine host WebSocket route.
pub const HOST_PATH: &str = "/v1/host";
/// Maximum payload bytes in one JSON message part.
pub const HOST_MESSAGE_PART_BYTES: usize = 262_144;
/// Maximum payload bytes in one stream data frame.
pub const HOST_STREAM_FRAME_BYTES: usize = 65_536;
/// Initial byte credit in each direction of a stream.
pub const HOST_STREAM_WINDOW_BYTES: usize = 262_144;
/// Maximum complete request JSON bytes.
pub const HOST_REQUEST_MAX_BYTES: usize = 4_194_304;
/// Maximum ordinary reply JSON bytes and inline text message bytes.
pub const HOST_REPLY_MAX_BYTES: usize = 1_048_576;
/// Maximum command reply JSON bytes.
pub const HOST_COMMAND_REPLY_MAX_BYTES: usize = 18_874_368;
/// Maximum raw file bytes in a file read.
pub const HOST_FILE_READ_MAX_BYTES: usize = 5_242_880;
/// Maximum requests awaiting a reply on one connection.
pub const HOST_MAX_PENDING_REQUESTS: usize = 64;
/// Maximum open streams on one connection.
pub const HOST_MAX_OPEN_STREAMS: usize = 64;
/// A newer connection replaced this connection.
pub const HOST_CLOSE_REPLACED: u16 = 4001;
/// The machine token changed or was revoked.
pub const HOST_CLOSE_TOKEN_CHANGED: u16 = 4003;
/// The host announced an unsupported protocol version.
pub const HOST_CLOSE_UNSUPPORTED_VERSION: u16 = 4400;
/// Interval between host ping messages.
pub const HOST_PING_SECONDS: u64 = 25;
