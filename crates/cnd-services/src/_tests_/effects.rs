//! Unimock effect capture. Production callers drive every state change.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::services::process::ServiceProcessResult;
use unimock::{MockFn, Unimock, matching};

use crate::error::Error;
use crate::ports::{
    Logs, LogsMock, OwnedPorts, OwnedPortsMock, Runtime, RuntimeMock, StartupEnvironment,
    StartupEnvironmentMock, Store, StoreMock, Units, UnitsMock,
};
use crate::records::UnitStatus;

use super::support::World;

pub(super) fn units(world: Arc<Mutex<World>>, stopping: bool) -> Arc<dyn Units> {
    let launch = world.clone();
    let stop = world.clone();
    let launch = UnitsMock::launch
        .each_call(matching!(_, _))
        .answers_arc(Arc::new(move |_, unit, _| {
            let mut world = launch.lock().unwrap();
            world.launched.push(unit.into());
            if world.fail_launch {
                return Err(Error::Unit);
            }
            world.units.insert(
                unit.into(),
                UnitStatus {
                    running: true,
                    cgroup: Some(format!("/system.slice/{unit}")),
                    result: None,
                },
            );
            Ok(())
        }));
    let stop = UnitsMock::stop
        .each_call(matching!(_))
        .answers_arc(Arc::new(move |_, unit| {
            let mut world = stop.lock().unwrap();
            world.stopped.push(unit.into());
            let result = match world
                .units
                .get(unit)
                .and_then(|status| status.result.clone())
            {
                Some(ServiceProcessResult::OutOfMemory) => ServiceProcessResult::OutOfMemory,
                _ => ServiceProcessResult::Signal { signal: 15 },
            };
            world.units.insert(
                unit.into(),
                UnitStatus {
                    running: false,
                    cgroup: None,
                    result: Some(result),
                },
            );
            Ok(())
        }));
    let inspect = UnitsMock::inspect
        .each_call(matching!(_))
        .answers_arc(Arc::new(move |_, unit| {
            Ok(world
                .lock()
                .unwrap()
                .units
                .get(unit)
                .cloned()
                .unwrap_or(UnitStatus {
                    running: false,
                    cgroup: None,
                    result: None,
                }))
        }));
    Arc::new(if stopping {
        Unimock::new((launch, stop, inspect))
    } else {
        Unimock::new((launch, inspect))
    })
}

pub(super) fn store(world: Arc<Mutex<World>>) -> Arc<dyn Store> {
    let load = world.clone();
    let save = world.clone();
    let prepare = world.clone();
    Arc::new(Unimock::new((
        StoreMock::load
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(load.lock().unwrap().registry.clone()))),
        StoreMock::save
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, state| {
                let mut world = save.lock().unwrap();
                if world.fail_save {
                    return Err(Error::Unit);
                }
                world.registry = Some(state.clone());
                world.saved.push(state);
                Ok(())
            })),
        StoreMock::prepare
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, record| {
                let path = PathBuf::from(format!("/runtime/{}.json", record.unit));
                prepare.lock().unwrap().prepared.push(record);
                Ok(path)
            })),
        StoreMock::completed
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, unit| {
                Ok(world.lock().unwrap().completed.get(unit).cloned())
            })),
    )))
}

pub(super) fn runtime(world: Arc<Mutex<World>>, waiting: bool) -> Arc<dyn Runtime> {
    let now = world.clone();
    let tick = world.clone();
    let wait = world.clone();
    let identity = world.clone();
    let now = RuntimeMock::now
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| {
            Timestamp(now.lock().unwrap().clock as i64)
        }));
    let monotonic = RuntimeMock::monotonic
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| tick.lock().unwrap().clock));
    let wait = RuntimeMock::wait
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| {
            let wait = wait.clone();
            Box::pin(async move {
                let callback = {
                    let mut world = wait.lock().unwrap();
                    world.clock += 10_000;
                    world.waits += 1;
                    world.on_wait.clone()
                };
                if let Some(callback) = callback {
                    callback();
                }
            })
        }));
    let identity = RuntimeMock::identity
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| {
            let mut world = identity.lock().unwrap();
            world.identities += 1;
            format!("id-{}", world.identities)
        }));
    let boot_id = RuntimeMock::boot_id
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| Ok(world.lock().unwrap().boot.clone())));
    Arc::new(if waiting {
        Unimock::new((now, monotonic, wait, identity, boot_id))
    } else {
        Unimock::new((now, identity, boot_id))
    })
}

pub(super) fn ports(world: Arc<Mutex<World>>) -> Arc<dyn OwnedPorts> {
    Arc::new(Unimock::new(
        OwnedPortsMock::scan
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, group| {
                let mut world = world.lock().unwrap();
                world.scans.push(group.into());
                Ok(world.ports.clone())
            })),
    ))
}

pub(super) fn logs(world: Arc<Mutex<World>>, reading: bool) -> Arc<dyn Logs> {
    if !reading {
        return Arc::new(Unimock::new(()));
    }
    Arc::new(Unimock::new(
        LogsMock::read
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                let world = world.lock().unwrap();
                Ok((world.log.clone(), world.omitted))
            })),
    ))
}

pub(super) fn environment() -> Arc<dyn StartupEnvironment> {
    Arc::new(Unimock::new(
        StartupEnvironmentMock::read
            .each_call(matching!())
            .answers(&|_| {
                Ok(BTreeMap::from([
                    ("ORG".into(), "frozen".into()),
                    ("PATH".into(), "/basic/bin".into()),
                ]))
            }),
    ))
}
