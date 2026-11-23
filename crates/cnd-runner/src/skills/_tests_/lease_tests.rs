//! Lease release triggers reclamation without another network check.

#![allow(clippy::unwrap_used)]

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use unimock::{MockFn, Unimock, matching};

use crate::skills::boundary::{OrgSkills, SkillsStorageMock};

use super::SkillsCopy;

#[tokio::test(start_paused = true)]
async fn sweeps_retired_copies_only_after_the_last_helper_lease_is_released() {
    let sweeps = Arc::new(Mutex::new(vec![]));
    let observed = sweeps.clone();
    let storage = Arc::new(Unimock::new((
        SkillsStorageMock::prepare
            .some_call(matching!(Some("org/skills")))
            .returns(Ok(None)),
        SkillsStorageMock::update.stub(|each| {
            each.call(matching!("org/skills"))
                .answers(&|_, _| Ok(Some(PathBuf::from("/one/skills"))))
                .once()
                .then()
                .answers(&|_, _| Ok(Some(PathBuf::from("/two/skills"))))
                .once();
        }),
        SkillsStorageMock::sweep
            .each_call(matching!("org/skills", _))
            .answers_arc(Arc::new(move |_, _, retained| {
                observed.lock().unwrap().push(retained.to_vec());
                Ok(())
            })),
    )));
    let copy = SkillsCopy::new(Some("org/skills".into()), storage);
    copy.start().await;
    tokio::task::yield_now().await;
    {
        let lease = copy.current().unwrap();
        tokio::time::advance(Duration::from_secs(300)).await;
        tokio::task::yield_now().await;
        assert_eq!(lease.path(), std::path::Path::new("/one/skills"));
        assert_eq!(
            sweeps.lock().unwrap().last().unwrap(),
            &vec![PathBuf::from("/one/skills"), PathBuf::from("/two/skills")]
        );
    }
    tokio::task::yield_now().await;
    assert_eq!(
        sweeps.lock().unwrap().last().unwrap(),
        &vec![PathBuf::from("/two/skills")]
    );
    copy.close().await;
}
