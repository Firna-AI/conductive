//! Public Git never inherits credentials, user configuration, or workspace state.

use std::collections::BTreeMap;
use std::ffi::OsString;
use std::path::PathBuf;

use super::command;
use crate::skills::boundary::SkillsGitRequest;

#[test]
fn git_has_only_public_access_settings_and_literal_arguments() {
    let request = SkillsGitRequest {
        home: PathBuf::from("/private/git-home"),
        args: vec![
            "fetch".into(),
            "--".into(),
            "https://github.com/owner/name.git".into(),
            "HEAD".into(),
        ],
    };
    let environment = [
        ("PATH", "/bin"),
        ("TMPDIR", "/tmp/test"),
        ("CONDUCTIVE_WORKSPACE_TOKEN", "secret"),
        ("GH_TOKEN", "secret"),
        ("GITHUB_TOKEN", "secret"),
        ("GIT_CONFIG_COUNT", "1"),
        ("GIT_CONFIG_KEY_0", "http.extraHeader"),
        ("GIT_CONFIG_VALUE_0", "Authorization: secret"),
        ("GIT_DIR", "/workspace/.git"),
        ("HOME", "/user-home"),
        ("OPENAI_API_KEY", "secret"),
        ("GIT_ASKPASS", "/get-token"),
        ("SSH_ASKPASS", "/get-token"),
    ]
    .map(|(name, value)| (OsString::from(name), OsString::from(value)));
    let command = command(&request, environment.into_iter());
    let command = command.as_std();
    assert_eq!(command.get_current_dir(), Some(request.home.as_path()));
    let actual: BTreeMap<_, _> = command
        .get_envs()
        .map(|(name, value)| (name.to_os_string(), value.map(OsString::from)))
        .collect();
    let expected: BTreeMap<_, _> = [
        ("PATH", "/bin"),
        ("TMPDIR", "/tmp/test"),
        ("HOME", "/private/git-home"),
        ("LC_ALL", "C"),
        ("GIT_CONFIG_NOSYSTEM", "1"),
        ("GIT_CONFIG_GLOBAL", "/dev/null"),
        ("GIT_TERMINAL_PROMPT", "0"),
        ("GIT_ASKPASS", ""),
        ("SSH_ASKPASS", ""),
    ]
    .map(|(name, value)| (OsString::from(name), Some(OsString::from(value))))
    .into();
    assert_eq!(actual, expected);
    assert_eq!(
        command.get_args().collect::<Vec<_>>(),
        [
            "-c",
            "credential.helper=",
            "fetch",
            "--",
            "https://github.com/owner/name.git",
            "HEAD",
        ]
    );
}
