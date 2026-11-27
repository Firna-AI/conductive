//! A workspace command lease keeps the restored root filesystem writable.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use unimock::{Clause, MockFn, Unimock, matching};

use super::super::{
    MockLeasePaths, MockProcessExists, MockRead, MockRemoveLease, MockRemoveLine, MockUnixSeconds,
};
use super::{apply, ext4_root, restore_ended, root_space, write_hold};

const LIVE_LEASE: &str = "/run/conductive-disk/leases/live";
const DEAD_LEASE: &str = "/run/conductive-disk/leases/dead";
const EXPIRED_LEASE: &str = "/run/conductive-disk/leases/expired";

fn leases(paths: &[&str]) -> impl Clause {
    (
        MockLeasePaths.each_call(matching!()).answers_arc(Arc::new({
            let paths: Vec<_> = paths.iter().map(PathBuf::from).collect();
            move |_| Ok(paths.clone())
        })),
        MockUnixSeconds
            .each_call(matching!())
            .answers(&|_| Ok(2_000_000_000)),
    )
}

#[test]
fn uses_the_default_hold_when_a_lease_owner_is_live_after_restore() {
    let disk = Unimock::new((
        ext4_root(),
        leases(&[LIVE_LEASE]),
        MockRead
            .each_call(matching!((path) if *path == Path::new(LIVE_LEASE)))
            .answers(&|_, _| Ok(b"41 2000000001\n".to_vec())),
        MockProcessExists
            .each_call(matching!((pid) if pid.as_raw_pid() == 41))
            .answers(&|_, _| Ok(true)),
        write_hold(4096),
    ));

    apply(&disk, 72_000_000_000).unwrap();
}

#[test]
fn removes_dead_and_expired_leases_and_applies_the_configured_hold() {
    let removed = Arc::new(Mutex::new(Vec::new()));
    let record_removal = Arc::clone(&removed);
    let disk = Unimock::new((
        ext4_root(),
        restore_ended(true),
        root_space(2_650_000),
        MockRemoveLine.some_call(matching!()).returns(Ok(())),
        leases(&[DEAD_LEASE, EXPIRED_LEASE]),
        MockRead
            .each_call(matching!((path) if *path == Path::new(DEAD_LEASE)))
            .answers(&|_, _| Ok(b"41 2000000001\n".to_vec())),
        MockRead
            .each_call(matching!((path) if *path == Path::new(EXPIRED_LEASE)))
            .answers(&|_, _| Ok(b"42 1999999999\n".to_vec())),
        MockProcessExists
            .each_call(matching!((pid) if pid.as_raw_pid() == 41))
            .answers(&|_, _| Ok(false)),
        MockRemoveLease
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, path| {
                record_removal.lock().unwrap().push(path.to_owned());
                Ok(())
            })),
        write_hold(2_421_875),
    ));

    apply(&disk, 72_000_000_000).unwrap();

    assert_eq!(
        *removed.lock().unwrap(),
        [PathBuf::from(DEAD_LEASE), PathBuf::from(EXPIRED_LEASE)]
    );
}
