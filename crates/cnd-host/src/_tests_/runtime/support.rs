//! Stable fake connection settings for retry tests.

use crate::config::ConnectionRequest;

pub(super) fn settings() -> ConnectionRequest {
    ConnectionRequest {
        origin: "https://machine.test".into(),
        token: "private".into(),
    }
}
