import { createApp } from '../../application'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import { NativeAlarmWorkspace } from '../../lifecycle/native-alarm-workspace.test-support'

export class Workspace extends NativeAlarmWorkspace {}

export default createApp({ now: () => DEVICE_TEST_NOW })
