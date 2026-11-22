//! One native manager and local socket for the whole runner process lifetime.

use std::path::PathBuf;
use std::sync::Arc;

use cnd_runner::config::Configuration;
use cnd_runner::ports::proc::DiskProcReader;
use cnd_services::environment::CleanEnvironment;
use cnd_services::files::{RuntimeFiles, SERVICES_DIRECTORY};
use cnd_services::logs::files::RuntimeLogFiles;
use cnd_services::logs::rotating::RotatingLogs;
use cnd_services::manager::state::{Dependencies, SavedManager, ServiceManager};
use cnd_services::ownership::{CgroupPorts, ProcSource};
use cnd_services::runtime::NativeRuntime;
use cnd_services::settings::NativeSettings;
use cnd_services::socket::server::{LocalServer, UnixServer};
use cnd_services::systemd::SystemUnits;

/// Compose without IO. Runner startup reconciles before the socket serves calls.
pub(crate) fn manager(
    configuration: &Configuration,
    executable: PathBuf,
    development: bool,
) -> Arc<dyn ServiceManager> {
    let root = PathBuf::from(SERVICES_DIRECTORY);
    Arc::new(SavedManager::new(Dependencies {
        units: Arc::new(SystemUnits {
            executable: if development {
                executable
            } else {
                PathBuf::from("/opt/conductive/current/conductive")
            },
        }),
        store: Arc::new(RuntimeFiles::new(root.clone())),
        logs: Arc::new(RotatingLogs {
            files: Arc::new(RuntimeLogFiles { root }),
        }),
        ports: Arc::new(CgroupPorts {
            reader: Arc::new(ProcSource {
                reader: Arc::new(DiskProcReader),
            }),
            uid: rustix::process::getuid().as_raw(),
        }),
        environment: Arc::new(CleanEnvironment {
            settings: Arc::new(NativeSettings {
                path: PathBuf::from("/run/ascii-secrets/env.sh"),
            }),
        }),
        runtime: Arc::new(NativeRuntime::default()),
        home: configuration.home.clone(),
        repository: configuration.cwd.clone(),
    }))
}

/// The listener belongs to the runner. Unit output and processes do not.
pub(crate) fn server(manager: Arc<dyn ServiceManager>) -> Arc<dyn LocalServer> {
    Arc::new(UnixServer {
        path: PathBuf::from(SERVICES_DIRECTORY).join("control.sock"),
        manager,
    })
}
