//! Real local files, metadata, links, directories, and fixed file errors.

use std::error::Error;
use std::fs::OpenOptions;
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::os::unix::net::UnixListener;
use std::time::Duration;

use cnd_host::files::NativeFiles;
use cnd_host::ports::Files;
use cnd_runner_interface::host::results::{HostErrorCode, HostFileEncoding, HostResult};
use rustix::fs::{CWD, Mode, OFlags, mkfifoat};

#[tokio::test]
async fn file_info_and_read_follow_links_and_keep_binary_content_as_base64()
-> Result<(), Box<dyn Error>> {
    let folder = tempfile::tempdir()?;
    let path = folder.path().join("file");
    let link = folder.path().join("link");
    tokio::fs::write(&path, [0, 255, 128]).await?;
    tokio::fs::symlink(&path, &link).await?;
    let path = link.to_string_lossy().into_owned();
    let files: &dyn Files = &NativeFiles;
    assert_eq!(
        files.info(&path).await?,
        HostResult::FileInfo {
            path: path.clone(),
            size_bytes: 3,
            is_directory: false
        }
    );
    assert_eq!(
        files.read(&path, 3).await?,
        HostResult::FileContent {
            path,
            size_bytes: 3,
            encoding: HostFileEncoding::Base64,
            content: "AP+A".into()
        }
    );
    Ok(())
}

#[tokio::test]
async fn file_reads_return_too_large_directory_missing_and_permission_errors()
-> Result<(), Box<dyn Error>> {
    let folder = tempfile::tempdir()?;
    let path = folder.path().join("file");
    tokio::fs::write(&path, b"abcd").await?;
    let text = path.to_string_lossy();
    let files: &dyn Files = &NativeFiles;
    assert_eq!(
        files.read(&text, 3).await?,
        HostResult::FileTooLarge {
            size_bytes: 4,
            limit_bytes: 3
        }
    );
    assert_eq!(
        files.read(&folder.path().to_string_lossy(), 3).await?,
        HostResult::Error {
            code: HostErrorCode::IsDirectory
        }
    );
    assert_eq!(
        files
            .info(&folder.path().join("missing").to_string_lossy())
            .await?,
        HostResult::Error {
            code: HostErrorCode::NotFound
        }
    );
    tokio::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o000)).await?;
    assert_eq!(
        files.read(&text, 5).await?,
        HostResult::Error {
            code: HostErrorCode::PermissionDenied
        }
    );
    let fifo = folder.path().join("fifo");
    mkfifoat(CWD, &fifo, Mode::RUSR | Mode::WUSR)?;
    let path = fifo.to_string_lossy().into_owned();
    assert_eq!(
        files.info(&path).await?,
        HostResult::FileInfo {
            path: path.clone(),
            size_bytes: 0,
            is_directory: false
        }
    );
    let result = tokio::time::timeout(Duration::from_secs(10), files.read(&path, 3)).await;
    {
        let _release = OpenOptions::new()
            .read(true)
            .write(true)
            .custom_flags(OFlags::NONBLOCK.bits() as i32)
            .open(&fifo)?;
    }
    assert!(
        matches!(
            result,
            Ok(Ok(HostResult::Error {
                code: HostErrorCode::InvalidRequest
            }))
        ),
        "FIFO read result: {result:?}"
    );
    let socket = folder.path().join("socket");
    let _listener = UnixListener::bind(&socket)?;
    for path in ["/dev/null", socket.to_str().ok_or("invalid socket path")?] {
        assert_eq!(
            files.read(path, 3).await?,
            HostResult::Error {
                code: HostErrorCode::InvalidRequest
            },
            "{path}"
        );
    }
    Ok(())
}
