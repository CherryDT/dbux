import { newLogger } from '@dbux/common/src/log/logger';
import ThemeMode from '@dbux/graph-common/src/shared/ThemeMode';
import {
  window,
  Uri
} from 'vscode';
import WebviewWrapper from '../codeUtil/WebviewWrapper';
import { showInformationMessage } from '../codeUtil/codeModals';
import { getResourcePath } from '../codeUtil/codePath';
import { buildWebviewClientHtml } from './clientSource';

/** @typedef {import('@dbux/graph-host/src/WebHost').HostWrapper} HostWrapper */

export default class RichWebView extends WebviewWrapper {
  /**
   * @type {HostWrapper}
   */
  hostWrapper;
  hostComponentManager;
  logger;

  constructor(HostWrapperClazz, id, col) {
    const hostWrapper = new HostWrapperClazz();
    const { name } = hostWrapper;
    super(id, name, col);

    this.hostWrapper = hostWrapper;
    this.logger = newLogger(name);
  }

  getMainScriptPath() {
    throw new Error('abstract method not implemented');
  }

  /**
   * Event handler callback
   */
  handleGraphHostStarted = (manager) => {
    // (re-)started!
    this.hostComponentManager = manager;
  }

  async buildClientHtml() {
    const mode = this.getThemeMode();
    const scriptPath = getResourcePath(this.getMainScriptPath());
    const modeFolderName = ThemeMode.getName(mode).toLowerCase();
    const themePath = getResourcePath('dist', 'web', modeFolderName, 'bootstrap.min.css');
    const src = await buildWebviewClientHtml([scriptPath], themePath);
    // console.debug('webview', src);
    return src;
    // return '<div id="root">hi!!</div>';
  }

  async startHost(ipcAdapter) {
    this.hostWrapper.startGraphHost(this.handleGraphHostStarted, this.restart, ipcAdapter, this.getExternals());
  }

  shutdownHost() {
    this.hostWrapper.shutdownGraphHost();
  }

  // ###########################################################################
  // provide externals to HostComponentManager
  // ###########################################################################

  getExternals() {
    return {
      ...this.sharedExternals,
      ...this.externals
    };
  }

  sharedExternals = {
    /**
     * Used for the "Restart" button
     */
    restart: this.restart,

    logClientError: (args) => {
      this.logger.error('[CLIENT ERROR]', ...args);
    },

    confirm: async (msg, modal = true) => {
      const confirmText = 'Ok';
      const btnConfig = { Ok: () => 'Ok' };
      if (!modal) {
        btnConfig.Cancel = () => 'Cancel';
      }
      const result = await showInformationMessage(msg, btnConfig, { modal });
      return result === confirmText;
    },

    alert(message, modal = true) {
      const cfg = { modal };
      showInformationMessage(message, { Ok: null }, cfg);
    },

    async prompt(message, defaultValue = '') {
      const result = await window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: message,
        value: defaultValue
      });
      return result;
    },

    getThemeMode: this.getThemeMode,

    /**
     * NOTE: we want to be very careful with vscode-resource urls.
     * @see https://github.com/microsoft/vscode/issues/127068
     */
    getClientResourceUri: (...segments) => {
      const p = getResourcePath(...segments);
      const uri = this.panel.webview.asWebviewUri(Uri.file(p)).toString();
      // console.debug('getClientResourceUri', uri);
      return uri;
    }
  }
}