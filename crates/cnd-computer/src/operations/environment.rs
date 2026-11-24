//! Shell-safe rendering of the container environment.

use cnd_runner_interface::computer::operations::ContainerEnvVar;

pub(super) fn valid_environment(env: &[ContainerEnvVar]) -> bool {
    env.iter().all(|entry| {
        !entry.name.is_empty() && !entry.name.contains(['=', '\0']) && !entry.value.contains('\0')
    })
}

fn shell_name(name: &str) -> bool {
    let mut bytes = name.bytes();
    bytes
        .next()
        .is_some_and(|byte| byte == b'_' || byte.is_ascii_alphabetic())
        && bytes.all(|byte| byte == b'_' || byte.is_ascii_alphanumeric())
}

/// Render POSIX export lines and count skipped names.
pub fn render(env: &[ContainerEnvVar]) -> (Vec<u8>, usize) {
    let mut text = String::new();
    let mut omitted = 0;
    for entry in env {
        if !shell_name(&entry.name) {
            omitted += 1;
            continue;
        }
        text.push_str("export '");
        text.push_str(&entry.name);
        text.push('=');
        text.push_str(&entry.value.replace('\'', "'\"'\"'"));
        text.push_str("'\n");
    }
    (text.into_bytes(), omitted)
}

#[cfg(test)]
#[path = "_tests_/environment_tests.rs"]
mod tests;
