//! Exact-turn selection for the separate one-shot session watch call.

use serde_json::{Map, Value};

use cnd_runner_interface::tools::session_watches::AgentWatchSessionRequest;

use crate::error::Result;

use super::parse::text;

pub(super) fn parse(fields: &Map<String, Value>) -> Result<AgentWatchSessionRequest> {
    Ok(AgentWatchSessionRequest {
        turn_id: fields
            .contains_key("turnId")
            .then(|| text(fields, "turnId"))
            .transpose()?,
    })
}
