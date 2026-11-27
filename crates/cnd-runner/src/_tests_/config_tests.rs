//! Service variables and Node-compatible path defaults.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use crate::config::{Configuration, is_skills_repository};
use crate::error::Error;
use crate::helper::process::NodeHelpers;
use crate::relocation::RepositoryTarget;

#[test]
fn parses_required_settings_and_only_named_repository_folders() {
    let mut env: BTreeMap<String, String> = [
        ("CONDUCTIVE_WORKSPACE_ID", "workspace"),
        ("CONDUCTIVE_WORKSPACE_TOKEN", "token"),
        ("CONDUCTIVE_RUNNER_URL", "https://machines.test/v1/runner"),
        ("CONDUCTIVE_REPOSITORY", "../repo"),
        ("CONDUCTIVE_DEFAULT_BRANCH", "main"),
        ("CONDUCTIVE_HOME", "../agents"),
        ("CONDUCTIVE_REPOSITORY_ZETA_DIR", "/repos/zeta"),
        ("CONDUCTIVE_REPOSITORY_API_DIR", "../api"),
        ("CONDUCTIVE_REPOSITORY_DIR", "/ignored"),
        ("CONDUCTIVE_REPOSITORY_API_TOKEN", "secret"),
        ("CONDUCTIVE_REPOSITORY_empty_DIR", "/ignored"),
        ("CONDUCTIVE_REPOSITORY_EMPTY_DIR", ""),
    ]
    .into_iter()
    .map(|(a, b)| (a.into(), b.into()))
    .collect();
    let config =
        Configuration::parse(&env, Path::new("/code/current"), Path::new("/home/user")).unwrap();
    assert_eq!(config.cwd, PathBuf::from("/code/repo"));
    assert_eq!(config.home, PathBuf::from("/code/agents"));
    assert_eq!(
        config.state_path,
        PathBuf::from("/code/agents/.conductive/runner-state.json")
    );
    assert_eq!(config.workspace_branch, None);
    assert_eq!(
        config.repository_directories,
        BTreeMap::from([
            (
                "CONDUCTIVE_REPOSITORY_API_DIR".into(),
                PathBuf::from("/code/api")
            ),
            (
                "CONDUCTIVE_REPOSITORY_ZETA_DIR".into(),
                PathBuf::from("/repos/zeta")
            )
        ])
    );
    env.insert("CONDUCTIVE_WORKSPACE_BRANCH".into(), "alice/work".into());
    env.insert("CONDUCTIVE_STATE_PATH".into(), "custom-state.json".into());
    let config = Configuration::parse(&env, Path::new("/code"), Path::new("/home/user")).unwrap();
    assert_eq!(config.workspace_branch.as_deref(), Some("alice/work"));
    assert_eq!(config.state_path, PathBuf::from("custom-state.json"));
    env.remove("CONDUCTIVE_WORKSPACE_TOKEN");
    assert!(matches!(
        Configuration::parse(&env, Path::new("/code"), Path::new("/home/user")),
        Err(Error::MissingSetting {
            name: "CONDUCTIVE_WORKSPACE_TOKEN"
        })
    ));
}

#[test]
fn agent_commands_keep_relative_org_values_and_export_registered_folders() {
    let mut environment = BTreeMap::from([
        ("CONDUCTIVE_WORKSPACE_ID".into(), "workspace".into()),
        ("CONDUCTIVE_WORKSPACE_TOKEN".into(), "token".into()),
        (
            "CONDUCTIVE_RUNNER_URL".into(),
            "https://machines.test/v1/runner".into(),
        ),
        (
            "CONDUCTIVE_REPOSITORY".into(),
            "/home/user/code/storefront".into(),
        ),
        ("CONDUCTIVE_DEFAULT_BRANCH".into(), "main".into()),
        ("CONDUCTIVE_REPOSITORY_API_DIR".into(), "../api".into()),
    ]);
    let mut configuration = Configuration::parse(
        &environment,
        Path::new("/home/user/code/storefront"),
        Path::new("/home/user"),
    )
    .unwrap();
    RepositoryTarget {
        folder: "/home/user/code/ledger".into(),
        default_branch: "trunk".into(),
        workspace_branch: "alice/moved".into(),
        variable: Some("CONDUCTIVE_REPOSITORY_LEDGER_DIR".into()),
    }
    .apply(&mut configuration);

    environment.extend(NodeHelpers::workspace_environment(&configuration));
    assert_eq!(environment["CONDUCTIVE_REPOSITORY_API_DIR"], "../api");
    assert_eq!(
        environment["CONDUCTIVE_REPOSITORY_LEDGER_DIR"],
        "/home/user/code/ledger"
    );
    assert_eq!(
        configuration.repository_directories["CONDUCTIVE_REPOSITORY_API_DIR"],
        Path::new("/home/user/code/api")
    );
}

#[test]
fn skills_repository_names_match_the_shared_folder_rule() {
    let valid = [
        "anthropics/skills".to_owned(),
        "openai/skills".to_owned(),
        "futex-ai/skills".to_owned(),
        "Owner-123/repo_name.v2-1".to_owned(),
        "owner/.github".to_owned(),
        format!("{}/{}", "a".repeat(39), "b".repeat(100)),
    ];
    let mut invalid = [
        "",
        "owner",
        "owner/name/extra",
        "owner/..",
        "owner/a..b",
        "owner/.",
        "owner name/repo",
        "owner/name ",
        " owner/name",
        "owner/name\n",
        "owner_name/repo",
        "-owner/name",
        "owner-/name",
        "ow--ner/name",
        "https://github.com/owner/name",
        "owner/name?x=1",
        "owner/name#main",
        "owner/name%2fother",
        "owner/name\\other",
        "owner/$(id)",
        "owner/`id`",
        "owner/name;echo",
        "owner/name:main",
        "owner/é",
    ]
    .map(str::to_owned)
    .to_vec();
    invalid.push(format!("{}/name", "a".repeat(40)));
    invalid.push(format!("owner/{}", "b".repeat(101)));
    for value in &valid {
        assert!(is_skills_repository(value), "{value:?}");
    }
    for value in &invalid {
        assert!(!is_skills_repository(value), "{value:?}");
    }
    let mut env = BTreeMap::from([
        ("CONDUCTIVE_WORKSPACE_ID".into(), "workspace".into()),
        ("CONDUCTIVE_WORKSPACE_TOKEN".into(), "token".into()),
        (
            "CONDUCTIVE_RUNNER_URL".into(),
            "https://machines.test/v1/runner".into(),
        ),
        ("CONDUCTIVE_REPOSITORY".into(), "/repo".into()),
        ("CONDUCTIVE_DEFAULT_BRANCH".into(), "main".into()),
    ]);
    for value in valid.iter().chain(invalid.iter()) {
        env.insert("CONDUCTIVE_SKILLS_REPOSITORY".into(), value.clone());
        let parsed =
            Configuration::parse(&env, Path::new("/repo"), Path::new("/home/user")).unwrap();
        assert_eq!(
            parsed.skills_repository.as_ref(),
            valid.contains(value).then_some(value)
        );
    }
}

#[test]
fn skills_trust_requires_a_valid_matching_source_and_preserves_source_case() {
    let mut env = BTreeMap::from([
        ("CONDUCTIVE_WORKSPACE_ID".into(), "workspace".into()),
        ("CONDUCTIVE_WORKSPACE_TOKEN".into(), "token".into()),
        (
            "CONDUCTIVE_RUNNER_URL".into(),
            "https://machines.test/v1/runner".into(),
        ),
        ("CONDUCTIVE_REPOSITORY".into(), "/repo".into()),
        ("CONDUCTIVE_DEFAULT_BRANCH".into(), "main".into()),
    ]);
    for (source, grant, expected_source, expected_trust) in [
        ("", "Owner/Skills", None, None),
        ("owner/../skills", "owner/skills", None, None),
        ("Owner/Skills", "", Some("Owner/Skills"), None),
        (
            "Owner/Skills",
            "owner/../skills",
            Some("Owner/Skills"),
            None,
        ),
        ("Owner/Skills", "other/skills", Some("Owner/Skills"), None),
        (
            "Owner/Skills",
            "OWNER/SKILLS",
            Some("Owner/Skills"),
            Some("owner/skills"),
        ),
    ] {
        env.insert("CONDUCTIVE_SKILLS_REPOSITORY".into(), source.into());
        env.insert("CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY".into(), grant.into());
        let parsed =
            Configuration::parse(&env, Path::new("/repo"), Path::new("/home/user")).unwrap();
        assert_eq!(
            parsed.skills_repository.as_deref(),
            expected_source,
            "{source:?}"
        );
        assert_eq!(
            parsed.trusted_skills_repository.as_deref(),
            expected_trust,
            "{source:?} {grant:?}"
        );
    }
}
