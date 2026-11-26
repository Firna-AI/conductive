//! In-memory captured effects and exact request fixtures.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::services::control::{ServiceControlAction, ServiceControlRequest};
use cnd_runner_interface::services::local::{
    ServiceDefinition, ServiceLocalEntry, ServiceLocalRequest, ServiceLocalResponse,
    ServiceStartRequest, ServiceStartResult,
};
use cnd_runner_interface::services::process::ServiceTarget;

use crate::manager::state::{Dependencies, SavedManager, ServiceManager};
use crate::records::{CompletedRun, LaunchRecord, Registry, UnitStatus};

use super::effects;

#[derive(Default)]
pub(super) struct World {
    pub registry: Option<Registry>,
    pub saved: Vec<Registry>,
    pub prepared: Vec<LaunchRecord>,
    pub units: BTreeMap<String, UnitStatus>,
    pub completed: BTreeMap<String, CompletedRun>,
    pub launched: Vec<String>,
    pub stopped: Vec<String>,
    pub fail_launch: bool,
    pub fail_save: bool,
    pub clock: u64,
    pub identities: u64,
    pub ports: Vec<u16>,
    pub scans: Vec<String>,
    pub boot: String,
    pub log: Vec<u8>,
    pub omitted: bool,
    pub waits: usize,
    pub on_wait: Option<Arc<dyn Fn() + Send + Sync>>,
}

pub(super) struct Fixture {
    pub world: Arc<Mutex<World>>,
    pub manager: Arc<dyn ServiceManager>,
    effects: Dependencies,
}

impl Fixture {
    pub(super) fn new() -> Self {
        Self::with(false, false, false)
    }

    pub(super) fn with(stopping: bool, reading: bool, waiting: bool) -> Self {
        let world = Arc::new(Mutex::new(World {
            boot: "boot".into(),
            ..World::default()
        }));
        let effects = dependencies(world.clone(), stopping, reading, waiting);
        let manager = Arc::new(SavedManager::new(effects.clone()));
        Self {
            world,
            manager,
            effects,
        }
    }

    pub(super) fn reopen(&self) -> Arc<dyn ServiceManager> {
        Arc::new(SavedManager::new(self.effects.clone()))
    }

    pub(super) fn with_effects(
        &self,
        change: impl FnOnce(&mut Dependencies),
    ) -> Arc<dyn ServiceManager> {
        let mut effects = self.effects.clone();
        change(&mut effects);
        Arc::new(SavedManager::new(effects))
    }

    pub(super) async fn start(&self, id: &str, name: &str, program: &str) -> ServiceStartResult {
        match self.manager.call(start(id, name, program)).await.unwrap() {
            ServiceLocalResponse::Start { result, .. } => result,
            other => panic!("wrong reply: {other:?}"),
        }
    }

    pub(super) async fn list(&self) -> Vec<ServiceLocalEntry> {
        match self
            .manager
            .call(ServiceLocalRequest::List {
                request_id: "list".into(),
            })
            .await
            .unwrap()
        {
            ServiceLocalResponse::List { services, .. } => services,
            other => panic!("wrong reply: {other:?}"),
        }
    }
}

fn dependencies(
    world: Arc<Mutex<World>>,
    stopping: bool,
    reading: bool,
    waiting: bool,
) -> Dependencies {
    Dependencies {
        units: effects::units(world.clone(), stopping),
        store: effects::store(world.clone()),
        runtime: effects::runtime(world.clone(), waiting),
        ports: effects::ports(world.clone()),
        logs: effects::logs(world, reading),
        environment: effects::environment(),
        home: PathBuf::from("/home/user"),
        repository: PathBuf::from("/home/user/code/app"),
    }
}

pub(super) fn start(id: &str, name: &str, program: &str) -> ServiceLocalRequest {
    ServiceLocalRequest::Start {
        request: ServiceStartRequest {
            request_id: id.into(),
            name: name.into(),
            definition: ServiceDefinition {
                command: vec![program.into(), "argument with spaces".into()],
                folder: "/home/user/code/app/100%literal".into(),
                env: BTreeMap::from([("EXPLICIT".into(), "kept".into())]),
            },
            originating_turn_id: Some(format!("turn-{id}")),
            wait_for_port: None,
        },
    }
}

pub(super) fn control(
    id: &str,
    target: ServiceTarget,
    action: ServiceControlAction,
) -> ServiceLocalRequest {
    ServiceLocalRequest::Control {
        request: ServiceControlRequest {
            request_id: id.into(),
            target,
            action,
        },
    }
}

pub(super) fn ended(
    result: cnd_runner_interface::services::process::ServiceProcessResult,
) -> CompletedRun {
    CompletedRun {
        ended_at: Timestamp(50),
        result,
    }
}
