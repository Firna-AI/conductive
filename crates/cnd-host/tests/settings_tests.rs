//! Saved shell settings are reread without changing the host environment.

use std::error::Error;

use cnd_host::config::SavedConfiguration;
use cnd_host::ports::Configuration;

#[tokio::test]
async fn saved_settings_wait_for_both_values_and_reread_rotation_without_exporting()
-> Result<(), Box<dyn Error>> {
    let folder = tempfile::tempdir()?;
    let source = SavedConfiguration {
        path: folder.path().join("settings.sh"),
    };
    let original = std::env::var_os("CONDUCTIVE_MACHINE_TOKEN");
    assert_eq!(
        source
            .read()
            .await?
            .map(|value| (value.origin, value.token)),
        None
    );
    tokio::fs::write(
        &source.path,
        "export CONDUCTIVE_MACHINE_ORIGIN='https://machine.test'\n",
    )
    .await?;
    assert_eq!(
        source
            .read()
            .await?
            .map(|value| (value.origin, value.token)),
        None
    );
    for token in ["first-private", "rotated-private"] {
        tokio::fs::write(&source.path, format!("export CONDUCTIVE_MACHINE_ORIGIN='https://machine.test'\nexport CONDUCTIVE_MACHINE_TOKEN='{token}'\n")).await?;
        assert_eq!(
            source
                .read()
                .await?
                .map(|value| (value.origin, value.token)),
            Some(("https://machine.test".into(), token.into()))
        );
    }
    assert!(std::env::var_os("CONDUCTIVE_MACHINE_TOKEN") == original);
    Ok(())
}
