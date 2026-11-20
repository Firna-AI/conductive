//! Repository HTTP tests over real loopback connections and isolated files.

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

mod file_server {
    mod access_tests;
    mod content_tests;
    mod support;
}
