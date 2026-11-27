//! The configured hold reserves space for state saves on the root disk.

use std::ffi::OsStr;
use std::path::Path;

use unimock::{MockFn, Unimock, matching};

use super::super::{
    MockAllocateReserve, MockAvailableBytes, MockRemoveReserve, MockWriteHold, Operation, run,
};
use super::{
    CONFIGURED, ENV_FILE, MockRead, MockRemoveLine, VDA_SETTING, ext4_root, lock, measured_space,
    no_leases, restore_ended, write_hold,
};

const RESERVE: &str = "/var/lib/conductive/runner-reserve";

#[test]
fn allocates_the_reserve_when_user_has_one_gib_after_the_hold() {
    let disk = Unimock::new((
        ext4_root(),
        no_leases(),
        restore_ended(true),
        measured_space(4_000_000),
        MockRemoveLine.some_call(matching!()).returns(Ok(())),
        MockWriteHold
            .next_call(matching!((path, 2_421_875) if *path == Path::new(VDA_SETTING)))
            .returns(Ok(())),
        MockAvailableBytes
            .next_call(matching!())
            .returns(Ok(1_073_741_824)),
        MockAllocateReserve
            .next_call(matching!((path, 268_435_456) if *path == Path::new(RESERVE)))
            .returns(Ok(())),
    ));
    run(&disk, Operation::Hold, Some(OsStr::new(CONFIGURED))).unwrap();
}

#[test]
fn skips_the_reserve_when_user_has_less_than_one_gib_after_the_hold() {
    let disk = Unimock::new((
        ext4_root(),
        no_leases(),
        restore_ended(true),
        measured_space(4_000_000),
        MockRemoveLine.some_call(matching!()).returns(Ok(())),
        write_hold(2_421_875),
        MockAvailableBytes
            .some_call(matching!())
            .returns(Ok(1_073_741_823)),
    ));
    run(&disk, Operation::Hold, Some(OsStr::new(CONFIGURED))).unwrap();
}

#[test]
fn leaves_the_hold_and_reserve_alone_without_a_configured_line() {
    let disk = Unimock::new(
        MockRead
            .some_call(matching!((path) if *path == Path::new(ENV_FILE)))
            .returns(Ok(b"export OTHER='value'\n".to_vec())),
    );
    run(&disk, Operation::Hold, None).unwrap();
}

#[test]
fn frees_only_the_root_owned_runner_reserve() {
    let disk = Unimock::new((
        lock(),
        MockRemoveReserve
            .some_call(matching!((path) if *path == Path::new(RESERVE)))
            .returns(Ok(())),
    ));
    run(&disk, Operation::FreeReserve, None).unwrap();
}
