//! Private HTTP boundary for repository file previews.

/// Reserved loopback port of the runner's repository file server.
pub const FILE_SERVER_PORT: u16 = 7683;

/// Header that marks requests forwarded by the files preview proxy.
pub const FILES_HEADER: &str = "X-Conductive-Files";

/// Header with the public origin of a request forwarded by the files preview proxy.
pub const FILES_ORIGIN_HEADER: &str = "X-Conductive-Files-Origin";
