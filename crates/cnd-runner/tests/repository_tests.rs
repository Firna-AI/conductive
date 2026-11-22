//! Real Git repositories exercise the public repository boundary and isolated storage.

mod repository {
    mod base_tests;
    mod checkpoint_tests;
    mod content_tests;
    mod context_tests;
    mod hash_reuse_tests;
    mod index_states_tests;
    mod limits_tests;
    mod paths_tests;
    mod scan_reads_tests;
    mod snapshot_tests;
    mod stacked_base_tests;
    mod stat_tests;
    mod support;
    mod watch_tests;
}
