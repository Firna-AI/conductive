//! Resource text matches the Linux files and the Worker's string budget.

use super::{memory_bytes, system_label};

#[test]
fn reads_total_memory_in_bytes_and_rejects_unsafe_counts() {
    assert_eq!(
        memory_bytes("MemTotal:       16384 kB\nMemFree: 100 kB\n"),
        Some(16_777_216)
    );
    assert_eq!(memory_bytes("MemTotal: 9007199254740992 kB"), None);
    assert_eq!(memory_bytes("MemFree: 10 kB"), None);
}

#[test]
fn reports_name_version_and_architecture_with_fallbacks() {
    assert_eq!(
        system_label(
            "NAME=\"Ubuntu\"\nVERSION_ID=\"24.04\"\nPRETTY_NAME='Ubuntu LTS'\n",
            "x86_64"
        ),
        "Ubuntu 24.04 · x86_64"
    );
    assert_eq!(
        system_label("PRETTY_NAME=\"Example \\\"OS\\\"\"\n", "x86_64"),
        "Example \"OS\" · x86_64"
    );
    assert_eq!(system_label("", "x86_64"), "Linux · x86_64");
}

#[test]
fn os_label_keeps_the_architecture_within_the_worker_budget() {
    let label = system_label(
        &format!("NAME=\"{}\tOS\"\nVERSION_ID=1", "🧪".repeat(200)),
        "x86_64",
    );
    assert!(label.ends_with(" · x86_64"));
    assert!(label.encode_utf16().count() <= 256);
    assert!(!label.chars().any(char::is_control));
}
