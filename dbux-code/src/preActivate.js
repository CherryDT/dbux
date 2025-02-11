import { workspace, commands } from 'vscode';
import { newLogger } from '@dbux/common/src/log/logger';
import { initMemento, get as mementoGet, set as mementoSet } from './memento';
import { initInstallId } from './installId';
import { initLogging } from './logging';
import { initCodePath, setCodePathConfig } from './codeUtil/codePath';
import activate from './activate';
import { initPreActivateView } from './preActivateView/preActivateNodeProvider';
import { registerCommand } from './commands/commandUtil';
import { initDialogController } from './dialogs/dialogController';
import DialogNodeKind from './dialogs/DialogNodeKind';
import { showInformationMessage } from './codeUtil/codeModals';
import initLang, { translate } from './lang';
import { getCurrentResearch } from './research/Research';

/** @typedef {import('./dialogs/dialogController').DialogController} DialogController */

// eslint-disable-next-line no-unused-vars
const { log, debug, warn, error: logError } = newLogger('dbux-code');

// ###########################################################################
// activate state management
// ###########################################################################

let dbuxActivated;
setActivatedState(false);

/**
 * Set dbux activate state
 * @param {boolean} value 
 */
function setActivatedState(value) {
  dbuxActivated = value;
  commands.executeCommand('setContext', 'dbux.context.activated', dbuxActivated);
}

export function getActivatedState() {
  return dbuxActivated;
}

// ###########################################################################
// pre-activate
// ###########################################################################

/**
 * This will be called right after dbux has been activate and will call `doActivate` when needed
 * @param {import('vscode').ExtensionContext} context
 */
export default async function preActivate(context) {
  let autoStart;
  try {
    registerErrorHandler();

    initMemento(context);
    await initInstallId();
    initLogging();
    initCodePath(context);
    setCodePathConfig({
      exportDirectoryOverride: getCurrentResearch()?.getDataRootLfs()
    });

    await maybeSelectLanguage();
    await initLang(mementoGet('dbux.language'));

    // [debugging]
    // await dialogController.getDialog('survey1').clear();
    // await dialogController.getDialog('tutorial').clear();
    // await getOrCreateProjectManager(context).pathwayDataProvider.reset();

    commands.executeCommand('setContext', 'dbux.context.nodeEnv', process.env.NODE_ENV);
    commands.executeCommand('setContext', 'dbux.context.researchEnabled', !!process.env.RESEARCH_ENABLED);

    // the following should ensures `doActivate` will be called at least once
    autoStart = (process.env.NODE_ENV === 'development') ||
      workspace.getConfiguration('dbux').get('autoStart');
    if (autoStart) {
      await ensureActivate(context);
    }
    else {
      initPreActivateView();
      initPreActivateCommand(context);
    }

    // TODO: fix tutorial and initial survey
    // const dialogController = initDialogController();
    // await maybeStartTutorial(dialogController, context);
    // await maybeContinueSurvey1(dialogController, context);
  }
  catch (err) {
    logError(`DBUX activate FAILED (autoStart=${autoStart}) -`, err);
  }
  finally {
    // log(`DBUX `);
  }
}

async function doActivate(context) {
  if (getActivatedState()) {
    throw new Error('Trying to activate Dbux twice');
  }

  // set state immediately to avoid called twice
  setActivatedState(true);
  await activate(context);
}

async function ensureActivate(context) {
  if (!getActivatedState()) {
    await doActivate(context);
  }
}

/**
 * @param {import('vscode').ExtensionContext} context
 */
function initPreActivateCommand(context) {
  registerCommand(context, 'dbux.doActivate', async () => ensureActivate(context));
}

function registerErrorHandler() {
  // process.on('unhandledRejection', (reason, promise) => {
  //   logError(`[Unhandled Rejection] reason: ${reason}, promise: ${promise}`);
  //   // debugger;
  // });
}

async function maybeSelectLanguage() {
  const keyName = `dbux.language`;

  if (!mementoGet(keyName)) {
    // TODO: re-enable multi-language support, once we have a significant amount of messages translated
    // let lang = await showInformationMessage('Select a language for dbux', {
    //   en: () => 'en',
    //   zh: () => 'zh',
    // }, { modal: true });
    const lang = 'en';
    await mementoSet(keyName, lang);
  }
}

// ###########################################################################
// Maybe start dialog on pre-activate
// ###########################################################################

/**
 * @param {DialogController} dialogController 
 */
async function maybeStartTutorial(dialogController, context) {
  const tutorialDialog = dialogController.getDialog('tutorial');
  const firstNode = tutorialDialog.getCurrentNode();

  if (!tutorialDialog.started) {
    await showInformationMessage(translate('newOnDbux.message'), {
      async [translate('newOnDbux.yes')]() {
        await ensureActivate(context);
        tutorialDialog.start('start');
      },
      async [translate('newOnDbux.no')]() {
        await tutorialDialog.setState('end');
      }
    });
  }
  else if (!firstNode.end) {
    // dialog unfinished
    if (firstNode.kind === DialogNodeKind.Modal) {
      const confirmResult = await tutorialDialog.askToContinue();
      if (confirmResult === false) {
        await tutorialDialog.setState('cancel');
      }
      else if (confirmResult) {
        await ensureActivate(context);
        tutorialDialog.start();
      }
    }
    else {
      await ensureActivate(context);
      tutorialDialog.start();
    }
  }
  else {
    // dialog finished, do nothing
  }
}

/**
 * @param {DialogController} dialogController 
 */
async function maybeContinueSurvey1(dialogController, context) {
  const surveyDialog = dialogController.getDialog('survey1');

  if (surveyDialog.started) {
    const firstNode = surveyDialog.getCurrentNode();
    if (!firstNode.end) {
      const confirmResult = await surveyDialog.askToContinue();
      if (confirmResult === false) {
        await surveyDialog.setState('cancel');
      }
      else if (confirmResult) {
        await ensureActivate(context);
        surveyDialog.start();
      }
    }
  }
}