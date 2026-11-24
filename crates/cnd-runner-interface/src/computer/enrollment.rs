//! Reply to an exchange of a one-time computer code.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Credential that the computer saves before it opens its first WebSocket.
#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ComputerEnrollment {
    /// Bearer token for this computer connection.
    pub computer_token: String,
}
