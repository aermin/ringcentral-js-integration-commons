import SDK from 'ringcentral';
import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import getEnvironmentReducer, {
  getServerReducer,
  getRecordingHostReducer,
  getEnabledReducer,
} from './getEnvironmentReducer';

/**
 * @class
 * @description Environment module manages which api server the app calls.
 */
export default class Environment extends RcModule {
  constructor({
    client,
    globalStorage,
    defaultRecordingHost,
    sdkConfig,
    ...options
  }) {
    super({
      ...options,
      actionTypes,
    });
    this._client = client;
    this._globalStorage = globalStorage;
    this._sdkConfig = sdkConfig;
    this._reducer = getEnvironmentReducer(this.actionTypes);
    this._serverStorageKey = 'environmentServer';
    this._recordingHostStoragekey = 'environmentRecordingHost';
    this._enabledStorageKey = 'environmentEnabled';
    this._globalStorage.registerReducer({
      key: this._serverStorageKey,
      reducer: getServerReducer({
        types: this.actionTypes,
        defaultServer: SDK.server.sandbox,
      }),
    });
    this._globalStorage.registerReducer({
      key: this._recordingHostStoragekey,
      reducer: getRecordingHostReducer({
        types: this.actionTypes,
        defaultRecordingHost: defaultRecordingHost ||
          'https://s3.ap-northeast-2.amazonaws.com/fetch-call-recording/test/index.html',
      }),
    });
    this._globalStorage.registerReducer({
      key: this._enabledStorageKey,
      reducer: getEnabledReducer(this.actionTypes),
    });
  }
  initialize() {
    this.store.subscribe(() => this._onStateChange());
  }
  _onStateChange() {
    if (this._shouldInit()) {
      this._initClientService();
      this.store.dispatch({
        type: this.actionTypes.initSuccess,
      });
    }
  }
  _shouldInit() {
    return this._globalStorage.ready && !this.ready;
  }
  _initClientService() {
    if (this.enabled) {
      this._client.service = new SDK({
        ...this._sdkConfig,
        server: this.server,
      });
    }
  }
  _changeEnvironment(enabled, server) {
    const newConfig = {
      ...this._sdkConfig,
    };
    if (enabled) {
      newConfig.server = server;
    }
    this._client.service = new SDK(newConfig);
  }

  setData({ server, recordingHost, enabled }) {
    const environmentChanged =
      this.enabled !== enabled ||
      (enabled && this.server !== server);
    if (environmentChanged) { // recordingHost changed no need to set to SDK
      this._changeEnvironment(enabled, server);
    }

    this.store.dispatch({
      type: this.actionTypes.setData,
      server,
      recordingHost,
      enabled,
      environmentChanged,
    });
  }
  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatuses.ready;
  }

  get server() {
    return this._globalStorage.getItem(this._serverStorageKey);
  }

  get recordingHost() {
    return this._globalStorage.getItem(this._recordingHostStoragekey);
  }

  get enabled() {
    return this._globalStorage.getItem(this._enabledStorageKey);
  }

  get changeCounter() {
    return this.state.changeCounter;
  }
}