import {
  ViewColumn
} from 'vscode';
import PathwaysHost from '@dbux/graph-host/src/PathwaysHost';
import { goToTrace, goToCodeLoc } from '../codeUtil/codeNav';
import { getProjectManager } from '../projectViews/projectControl';
import { emitPathwaysAction } from '../userEvents';
import RichWebView from './RichWebView';
import { decorateVisitedTraces, stopDecorating } from './pathwaysDecorations';
import UserActionType from '@dbux/data/src/pathways/UserActionType';

const defaultColumn = ViewColumn.Two;

export default class PathwaysWebView extends RichWebView {
  constructor() {
    // 'Call Graph'
    super(PathwaysHost, 'dbux-pathways', defaultColumn);
  }

  get pdp() {
    return getProjectManager().practiceSession?.pdp;
  }

  getIcon() {
    // return getThemeResourcePathUri('tree.svg');
    return '';
  }

  getMainScriptPath() {
    return 'dist/web/pathways.client.js';
  }

  // ###########################################################################
  // provide externals to HostComponentManager
  // ###########################################################################

  externals = {
    goToTrace,
    goToCodeLoc,
    onPracticeSessionStateChanged(cb) {
      return getProjectManager().onPracticeSessionStateChanged(cb);
    },
    getPathwaysDataProvider: () => this.pdp,

    decorateVisitedTraces: async () => {
      await decorateVisitedTraces(this.pdp);
    },
    stopDecorating: async () => {
      await stopDecorating();
    },
  }
}

/**
 * @type {PathwaysWebView}
 */
let pathwaysWebView;

export async function showPathwaysView() {
  emitPathwaysAction(UserActionType.PathwaysVisibilityChanged, { isShowing: true });
  await initPathwaysView();
  return pathwaysWebView.show();
}

export function hidePathwaysView() {
  emitPathwaysAction(UserActionType.PathwaysVisibilityChanged, { isShowing: false });
  pathwaysWebView?.hide();
}

export async function initPathwaysView() {
  if (!pathwaysWebView) {
    pathwaysWebView = new PathwaysWebView();
    await pathwaysWebView.init();
  }
}