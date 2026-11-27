//! A move names only a known folder with a Git work tree, and a refusal gets a reply.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::runner_commands::RunnerBranches;
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::runner_repository::{
    RunnerRepositoryMove, RunnerRepositoryMoveRefusal, RunnerRepositoryMoveRefused,
};
use unimock::{MockFn, Unimock, matching};

use crate::config::{Configuration, ConnectionRequest};
use crate::helper::process::NodeHelpers;
use crate::link::ports::RunnerLinkMock;
use crate::relocation::{MoveCheck, RepositoryFolders, RepositoryTarget, check_move};
use crate::repository::io::{PathKind, RepositoryIoMock};

fn configuration() -> Configuration {
    Configuration {
        workspace_id: "workspace".into(),
        request: ConnectionRequest {
            url: "wss://machines.test/runner".into(),
            workspace_token: "token".into(),
        },
        cwd: "/home/user/code/storefront".into(),
        home: "/home/user".into(),
        default_branch: "main".into(),
        workspace_branch: Some("alice/cart-v1-ab12".into()),
        skills_repository: None,
        trusted_skills_repository: None,
        repository_directories: BTreeMap::from([
            (
                "CONDUCTIVE_REPOSITORY_BILLING_DIR".into(),
                PathBuf::from("/home/user/code/billing"),
            ),
            (
                "CONDUCTIVE_REPOSITORY_STOREFRONT_DIR".into(),
                PathBuf::from("/home/user/code/storefront"),
            ),
        ]),
        workspace_context: None,
        state_path: "/state".into(),
        disk_hold_enabled: false,
    }
}

fn branches() -> RunnerBranches {
    RunnerBranches {
        workspace_branch: "alice/cart-v2-cd34".into(),
        target_branch: "trunk".into(),
    }
}

fn folders(kind: PathKind) -> RepositoryFolders {
    let io = Unimock::new(
        RepositoryIoMock::kind
            .some_call(matching!(_))
            .answers_arc(Arc::new(move |_, path| {
                assert_eq!(path, PathBuf::from("/home/user/code/billing/.git"));
                Ok(kind)
            })),
    );
    RepositoryFolders::new(&configuration(), Arc::new(io))
}

#[tokio::test]
async fn moves_to_a_known_work_tree_with_the_new_branches() {
    for kind in [PathKind::Directory, PathKind::File] {
        let check = folders(kind)
            .check("/home/user/code/billing", &branches())
            .await;
        let target = RepositoryTarget {
            folder: "/home/user/code/billing".into(),
            default_branch: "trunk".into(),
            workspace_branch: "alice/cart-v2-cd34".into(),
        };
        assert_eq!(check, MoveCheck::Move(target.clone()));
        let mut moved = configuration();
        target.apply(&mut moved);
        assert_eq!(moved.cwd, PathBuf::from("/home/user/code/billing"));
        assert_eq!(moved.default_branch, "trunk");
        assert_eq!(
            moved.workspace_branch.as_deref(),
            Some("alice/cart-v2-cd34")
        );
        assert_eq!(
            NodeHelpers::workspace_environment(&moved),
            BTreeMap::from([
                ("CONDUCTIVE_DEFAULT_BRANCH".into(), "trunk".into()),
                (
                    "CONDUCTIVE_REPOSITORY".into(),
                    "/home/user/code/billing".into()
                ),
                (
                    "CONDUCTIVE_REPOSITORY_DIR".into(),
                    "/home/user/code/billing".into()
                ),
                (
                    "CONDUCTIVE_WORKSPACE_BRANCH".into(),
                    "alice/cart-v2-cd34".into()
                ),
            ])
        );
    }
}

#[tokio::test]
async fn keeps_the_current_folder_and_refuses_unknown_folders_and_missing_work_trees() {
    let unused = RepositoryFolders::new(&configuration(), Arc::new(Unimock::new(())));
    for (folder, expected) in [
        ("/home/user/code/storefront", MoveCheck::Current),
        (
            "/home/user/code/other",
            MoveCheck::Refused(RunnerRepositoryMoveRefusal::UnknownFolder),
        ),
        (
            "/home/user/code/billing/../storefront",
            MoveCheck::Refused(RunnerRepositoryMoveRefusal::UnknownFolder),
        ),
    ] {
        assert_eq!(
            unused.check(folder, &branches()).await,
            expected,
            "{folder}"
        );
    }
    for kind in [PathKind::Absent, PathKind::Link, PathKind::Special] {
        assert_eq!(
            folders(kind)
                .check("/home/user/code/billing", &branches())
                .await,
            MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository)
        );
    }
}

#[tokio::test]
async fn replies_only_to_a_refused_move() {
    let replies = Arc::new(Mutex::new(vec![]));
    let saved = replies.clone();
    let link = Unimock::new(
        RunnerLinkMock::reply
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, reply| {
                saved.lock().unwrap().push(reply);
                Ok(())
            })),
    );
    let request = |folder: &str| RunnerRepositoryMove::RepositoryMove {
        command_id: format!("move {folder}"),
        folder: folder.into(),
        branches: branches(),
    };
    let known = folders(PathKind::Directory);
    assert!(
        check_move(Some(&known), &link, &request("/home/user/code/billing"))
            .await
            .is_some()
    );
    let unused = RepositoryFolders::new(&configuration(), Arc::new(Unimock::new(())));
    for folders in [Some(&unused), None] {
        assert!(
            check_move(folders, &link, &request("/home/user/code/storefront-2"))
                .await
                .is_none()
        );
    }
    assert!(
        check_move(Some(&unused), &link, &request("/home/user/code/storefront"))
            .await
            .is_none()
    );
    let refused = RunnerToWorkspace::RunnerRepositoryMoveRefused(
        RunnerRepositoryMoveRefused::RepositoryMoveRefused {
            command_id: "move /home/user/code/storefront-2".into(),
            reason: RunnerRepositoryMoveRefusal::UnknownFolder,
        },
    );
    assert_eq!(*replies.lock().unwrap(), vec![refused.clone(), refused]);
}
