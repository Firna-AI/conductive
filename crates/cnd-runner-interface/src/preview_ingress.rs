//! Protected provider identity for the sandbox preview relay.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Current sandbox identity and the private ingress alias of each local port.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct PreviewIngressIdentity {
    /// Exact provider sandbox hostname label.
    pub sandbox_id: String,
    /// Exact provider routing domain.
    pub domain: String,
    /// Local listening port mapped to its provider ingress port.
    pub aliases: BTreeMap<String, u16>,
}
