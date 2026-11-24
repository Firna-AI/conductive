//! JSON snapshots of the computer enrollment and connection contracts.

macro_rules! computer_wire {
    ($name:ident, $ty:ty, $json:literal) => {
        #[test]
        fn $name() -> Result<(), serde_json::Error> {
            let message: $ty = serde_json::from_str($json)?;
            let expected: serde_json::Value = serde_json::from_str($json)?;
            assert_eq!(serde_json::to_value(&message)?, expected);
            insta::assert_json_snapshot!(stringify!($name), message);
            Ok(())
        }
    };
}

mod computer;
