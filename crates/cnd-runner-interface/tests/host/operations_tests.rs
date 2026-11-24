//! Every fixed operation, including safe integer byte offsets.

use cnd_runner_interface::host::operations::HostOperation;

host_wire!(
    command_run,
    HostOperation,
    r#"{"kind":"command.run","command":"printf hello","timeoutSeconds":600}"#
);
host_wire!(
    command_start,
    HostOperation,
    r#"{"kind":"command.start","command":"sleep 1"}"#
);
host_wire!(
    command_status,
    HostOperation,
    r#"{"kind":"command.status","processId":9007199254740991,"stdoutOffset":123,"stderrOffset":456}"#
);
host_wire!(
    file_info,
    HostOperation,
    r#"{"kind":"file.info","path":"/home/user/file.txt"}"#
);
host_wire!(
    file_read,
    HostOperation,
    r#"{"kind":"file.read","path":"/home/user/file.txt","maxBytes":5242880}"#
);
host_wire!(
    stream_open_terminal,
    HostOperation,
    r#"{"kind":"stream.open","streamId":9,"port":7681}"#
);
host_wire!(
    stream_open_relay,
    HostOperation,
    r#"{"kind":"stream.open","streamId":10,"port":7682}"#
);
