//! In-memory settings, signed release identities, and virtual update time.

use std::sync::Arc;

use cnd_runner_interface::computer::operations::ComputerRelease;
use unimock::Unimock;

use crate::activity::Activity;
use crate::connection_support::context;
use crate::releases::ports::VerifiedRelease;
use crate::settings::Settings;

use super::super::state::UpdateState;
use super::Updater;

pub(super) fn updater() -> Updater {
    let inert = Arc::new(Unimock::new(()));
    Updater {
        version: "0.0.41".into(),
        files: inert.clone(),
        settings: inert.clone(),
        releases: inert.clone(),
        process: inert.clone(),
        activity: Arc::new(Activity::default()),
        timer: inert.clone(),
        diagnostics: inert,
    }
}

pub(super) fn latest(version: &str) -> VerifiedRelease {
    VerifiedRelease(ComputerRelease {
        version: version.into(),
        digest: "a".repeat(64),
    })
}

pub(super) fn settings() -> Settings {
    let server = context().release_server;
    Settings {
        origin: server.clone(),
        token: "fixture".into(),
        release_server: server,
    }
}

pub(super) fn pending(starts: u32) -> UpdateState {
    UpdateState {
        previous: Some("0.0.40".into()),
        pending: Some("0.0.41".into()),
        starts,
        ..UpdateState::default()
    }
}
