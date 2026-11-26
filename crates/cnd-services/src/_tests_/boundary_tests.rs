//! Clean settings, rotating retention, and descendant-owned eligible listeners.

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use unimock::{MockFn, Unimock, matching};

use crate::environment::{CleanEnvironment, SettingsMock};
use crate::logs::rotating::{LogFilesMock, LogTransaction, LogTransactionMock, RotatingLogs};
use crate::ownership::{CgroupPorts, ProcessesMock};
use crate::ports::{Logs, OwnedPorts, StartupEnvironment};

#[tokio::test]
async fn clean_startup_keeps_org_project_values_and_removes_only_fixed_context() {
    let settings = Arc::new(Unimock::new((
        SettingsMock::basic
            .some_call(matching!())
            .returns(Ok(BTreeMap::from([
                ("HOME".into(), "/home/user".into()),
                ("PATH".into(), "/basic/bin".into()),
            ]))),
        SettingsMock::frozen
            .some_call(matching!())
            .returns(Ok(BTreeMap::from([
                ("WORKSPACE_TOKEN".into(), "private".into()),
                ("CONDUCTIVE_WORKSPACE_TOKEN".into(), "private".into()),
                ("CONDUCTIVE_TURN_ID".into(), "turn".into()),
                ("GIT_AUTHOR_EMAIL".into(), "author".into()),
                ("CONDUCTIVE_WORKSPACE_ID".into(), "workspace".into()),
                ("CONDUCTIVE_CUSTOM_ORG_KEY".into(), "arbitrary".into()),
                (
                    "CONDUCTIVE_REPOSITORY_CUSTOM_DIR".into(),
                    "/home/user/code/project".into(),
                ),
                ("ORG_SECRET".into(), "frozen".into()),
            ]))),
    )));
    let clean: Arc<dyn StartupEnvironment> = Arc::new(CleanEnvironment { settings });
    assert_eq!(
        clean.read().await.unwrap(),
        BTreeMap::from([
            ("HOME".into(), "/home/user".into()),
            ("PATH".into(), "/basic/bin".into()),
            ("CONDUCTIVE_CUSTOM_ORG_KEY".into(), "arbitrary".into()),
            (
                "CONDUCTIVE_REPOSITORY_CUSTOM_DIR".into(),
                "/home/user/code/project".into()
            ),
            ("ORG_SECRET".into(), "frozen".into()),
        ])
    );
}

#[tokio::test]
async fn rotation_keeps_ordered_bytes_and_removes_the_oldest_file_first() {
    let state = Arc::new(Mutex::new((Vec::<u8>::new(), vec![b'a'; 5_242_878], 0)));
    let length = state.clone();
    let rotate = state.clone();
    let append = state.clone();
    let transaction: Arc<dyn LogTransaction> = Arc::new(Unimock::new((
        LogTransactionMock::current_len
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| Ok(length.lock().unwrap().1.len() as u64))),
        LogTransactionMock::rotate
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                let mut state = rotate.lock().unwrap();
                state.0 = std::mem::take(&mut state.1);
                state.2 += 1;
                Ok(())
            })),
        LogTransactionMock::append
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, bytes| {
                append.lock().unwrap().1.extend_from_slice(bytes);
                Ok(())
            })),
    )));
    let files = Arc::new(Unimock::new(
        LogFilesMock::open
            .each_call(matching!("service"))
            .answers_arc(Arc::new(move |_, _| Ok(transaction.clone()))),
    ));
    let logs: Arc<dyn Logs> = Arc::new(RotatingLogs { files });
    logs.append("service", "🙂secret-tail".as_bytes().to_vec())
        .await
        .unwrap();
    {
        let state = state.lock().unwrap();
        assert_eq!(state.0.len(), 5_242_880);
        assert_eq!(&state.0[state.0.len() - 2..], &[0xf0, 0x9f]);
        assert_eq!(
            state.1,
            [vec![0x99, 0x82], b"secret-tail".to_vec()].concat()
        );
        assert_eq!(state.2, 1);
    }
    logs.append("service", vec![b'z'; 5_242_880]).await.unwrap();
    let state = state.lock().unwrap();
    assert_eq!(state.0.len(), 5_242_880);
    assert_eq!(state.1, vec![b'z'; 13]);
    assert_eq!(state.2, 2);
    assert_eq!(
        &state.0[..13],
        &[vec![0x99, 0x82], b"secret-tail".to_vec()].concat()
    );
}

#[tokio::test]
async fn readiness_ports_require_current_cgroup_or_descendant_and_existing_eligibility() {
    let processes = Arc::new(Unimock::new((
        ProcessesMock::read.each_call(matching!(_)).answers(&|_, path| Ok(match path.as_str() {
            "/proc/net/tcp" => "0: 0100007F:1435 0:0 0A 0:0 0:0 0 1000 0 1\n0: 00000000:0BB8 0:0 0A 0:0 0:0 0 1000 0 2\n0: 00000000:1E01 0:0 0A 0:0 0:0 0 1000 0 3\n".into(),
            "/proc/net/tcp6" => String::new(),
            "/proc/10/cgroup" => "0::/system.slice/current.service/child".into(),
            "/proc/11/cgroup" => "0::/system.slice/current.service-old".into(),
            _ => "0::/system.slice/previous.service".into(),
        })),
        ProcessesMock::list.each_call(matching!(_)).answers(&|_, path| Ok(if path == "/proc" { vec!["10".into(), "11".into(), "12".into()] } else { vec!["1".into(), "2".into()] })),
        ProcessesMock::link.each_call(matching!(_)).answers(&|_, path| Ok(match path.as_str() {
            "/proc/10/fd/1" => "socket:[1]".into(),
            "/proc/10/fd/2" => "socket:[3]".into(),
            _ => "socket:[2]".into(),
        })),
    )));
    let ports: Arc<dyn OwnedPorts> = Arc::new(CgroupPorts {
        reader: processes,
        uid: 1000,
    });
    assert_eq!(
        ports.scan("/system.slice/current.service").await.unwrap(),
        [5173]
    );
}
