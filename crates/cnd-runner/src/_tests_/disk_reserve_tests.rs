//! Runner state saves under disk pressure.

#![allow(clippy::unwrap_used)]

use std::io::{self, ErrorKind};
use std::path::Path;

use unimock::{Clause, MockFn, Unimock, matching};

use crate::disk_files::StateFilesMock;
use crate::error::Error;

use super::{AtomicDisk, Disk};

const STATE: &str = "/state/runner-state.json";
const RESERVE: &str = "/state/disk-reserve";

fn full() -> io::Error {
    rustix::io::Errno::NOSPC.into()
}

fn save(result: io::Result<()>) -> impl Clause {
    StateFilesMock::replace
        .next_call(matching!((path, bytes) if *path == Path::new(STATE) && *bytes == b"state"))
        .returns(result)
}

#[tokio::test]
async fn releases_the_reserve_retries_and_rebuilds_after_space_returns() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new((
            save(Err(full())),
            StateFilesMock::remove_reserve
                .next_call(matching!((path) if *path == Path::new(RESERVE)))
                .returns(Ok(())),
            save(Ok(())),
            save(Ok(())),
            StateFilesMock::reserve_ready
                .next_call(matching!((path) if *path == Path::new(RESERVE)))
                .returns(Ok(false)),
            StateFilesMock::available_bytes
                .next_call(matching!((path) if *path == Path::new("/state")))
                .returns(Ok(1_073_741_823)),
            save(Ok(())),
            StateFilesMock::reserve_ready
                .next_call(matching!((path) if *path == Path::new(RESERVE)))
                .returns(Ok(false)),
            StateFilesMock::available_bytes
                .next_call(matching!((path) if *path == Path::new("/state")))
                .returns(Ok(1_073_741_824)),
            StateFilesMock::allocate_reserve
                .next_call(matching!((path, 268_435_456) if *path == Path::new(RESERVE)))
                .returns(Ok(())),
        ))),
    );
    for _ in 0..3 {
        disk.write(b"state").await.unwrap();
    }
}

#[tokio::test]
async fn retries_once_and_returns_the_save_error_if_the_disk_stays_full() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new((
            save(Err(full())),
            StateFilesMock::remove_reserve
                .next_call(matching!((path) if *path == Path::new(RESERVE)))
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
async fn leaves_the_reserve_untouched_after_another_save_error() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new(save(Err(ErrorKind::PermissionDenied.into())))),
    );
    assert!(matches!(
        disk.write(b"state").await,
        Err(Error::Internal(_))
    ));
}

#[tokio::test]
async fn keeps_a_successful_state_save_if_reserve_allocation_fails() {
    let disk = AtomicDisk::with_files(
        STATE.into(),
        Box::new(Unimock::new((
            save(Ok(())),
            StateFilesMock::reserve_ready
                .some_call(matching!((path) if *path == Path::new(RESERVE)))
                .returns(Ok(false)),
            StateFilesMock::available_bytes
                .some_call(matching!((path) if *path == Path::new("/state")))
                .returns(Ok(2_000_000_000)),
            StateFilesMock::allocate_reserve
                .some_call(matching!((path, 268_435_456) if *path == Path::new(RESERVE)))
                .returns(Err(full())),
        ))),
    );
    disk.write(b"state").await.unwrap();
}
