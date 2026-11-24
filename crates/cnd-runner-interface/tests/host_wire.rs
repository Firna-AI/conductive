//! Host JSON snapshots, including every message, operation, and result form.

macro_rules! host_wire {
    ($name:ident, $ty:ty, $json:literal) => {
        #[test]
        fn $name() -> Result<(), serde_json::Error> {
            let message: $ty = serde_json::from_str($json)?;
            let expected: serde_json::Value = serde_json::from_str($json)?;
            assert_eq!(serde_json::to_value(&message)?, expected);
            insta::with_settings!({description => "Host protocol v1. Camel-case fields, exact tags, JSON numbers, and required nulls follow the host connection contract."}, {
                insta::assert_json_snapshot!(stringify!($name), message);
            });
            Ok(())
        }
    };
}

mod host;
