//! Atomic state saves under disk pressure.

#![allow(clippy::unwrap_used)]

use std::io::{self, ErrorKind};
use std::path::Path;

use unimock::{Clause, MockFn, Unimock, matching};

use crate::disk_files::StateFilesMock;
use crate::error::Error;

use super::{AtomicDisk, Disk};

const STATE: &str = "/state/runner-state.json";

fn full() -> io::Error {
    rustix::io::Errno::NOSPC.into()
}

fn save(result: io::Result<()>) -> impl Clause {
    StateFilesMock::replace
        .next_call(matching!((path, bytes) if *path == Path::new(STATE) && *bytes == b"state"))
        .returns(result)
}

#[tokio::test]
async fn frees_the_root_reserve_and_retries_a_full_state_save_once() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new((
            save(Err(full())),
            StateFilesMock::free_reserve
                .next_call(matching!())
                .returns(Ok(())),
            save(Ok(())),
        ))),
    );
    disk.write(b"state").await.unwrap();
}

#[tokio::test]
async fn retries_once_even_if_freeing_the_reserve_fails() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new((
            save(Err(full())),
            StateFilesMock::free_reserve
                .next_call(matching!())
                .returns(Err(ErrorKind::PermissionDenied.into())),
            save(Err(full())),
        ))),
    );
    assert!(matches!(
        disk.write(b"state").await,
        Err(Error::Internal(_))
    ));
}

#[tokio::test]
async fn keeps_the_reserve_when_the_state_save_fails_for_another_reason() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new(save(Err(ErrorKind::PermissionDenied.into())))),
    );
    assert!(matches!(
        disk.write(b"state").await,
        Err(Error::Internal(_))
    ));
}
