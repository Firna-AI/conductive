//! One embedded authority for preview metadata and provider header names.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Configuration {
    pub(crate) path: String,
    pub(crate) private_headers: BTreeMap<String, String>,
}

pub(crate) fn configuration() -> Option<&'static Configuration> {
    static CONFIG: OnceLock<Option<Configuration>> = OnceLock::new();
    CONFIG
        .get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../src/shared/preview-ingress-config.json"
            ))
            .ok()
        })
        .as_ref()
}
