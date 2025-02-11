import { writeMergePackageJson } from '@dbux/cli/lib/package-util';
import Project from '../../projectLib/Project';
import { buildJestRunBugCommand } from '../../util/jestUtil';

/** @typedef {import('../../projectLib/ExerciseConfig').ExerciseConfig} ExerciseConfig */

export default class JavascriptAlgorithmProject extends Project {
  gitRemote = 'trekhleb/javascript-algorithms.git';
  gitCommit = '9bb60fa';

  rmFiles = [
    'package-lock.json',
    '.babelrc',       // we need babel.config.js instead
    '.husky'   // unwanted commit hooks
  ];

  runCfg = {

  };

  async beforeInstall() {
    // remove husky from package.json
    writeMergePackageJson(this.projectPath, { scripts: { prepare: '' } });
  }

  canRunExercise(config) {
    return !!config.testFilePaths;
  }

  decorateExercise(config) {
    return {
      // id: i + 1,
      // name: config.testName,
      // description: bug.testName,
      runArgs: [
        '--runInBand', // -i
        '-t',
        /**
         * @see https://jestjs.io/docs/cli#--testnamepatternregex
         */
        `"${config.testNamePattern}"`,
        '--runTestsByPath',
        config.testFilePaths.join(' ')
      ],
      enableSourceMaps: false,
      ...config,
      // testFilePaths: bug.testFilePaths.map(p => `./${p}`)
    };
  }

  async selectExercise(exercise) {
    // nothing to do here
  }

  async runCommand(bug, cfg) {
    const { projectPath } = this;
    // const bugArgs = this.getMochaRunArgs(bug);
    const testCfg = this.getJestCfg(bug, [
      '--setupFilesAfterEnv ./dbuxJestSetup.js',
      '--colors'
    ]);

    /**
     * TODO: find `describe`
     * 
     * * for now, we cannot find the definition of the `describe` function
     * * or maybe some other way to determine how tests are registered and sorted?
     * * -> it's coming from `@jest/core` -> `runWithoutWatch`
     * * -> `nonFlagArgs` contains the test files (from `jest.config.js`)
     * * -> have not found the actual tests yet.
     * * -> for that, maybe console log tracing will help?
     * * if `jasmine` enabled -> https://github.com/facebook/jest/blob/e0b33b74b5afd738edc183858b5c34053cfc26dd/packages/jest-jasmine2/src/jasmine/Env.ts#L383
     */

    cfg = {
      ...cfg,
      ...testCfg,
      cwd: projectPath,
      /**
       * NOTE: Jest has a two-layer approach, where the first layer bootstraps Jest,
       *  and the second layer runs inside a VM (after running through `@jest/transform` and more).
       * We found that, if we run `Jest` with `@babel/register`, 
       * Jest's own transformer doubles up the instrumentation on some of the code.
       * 
       * One possible solution: make sure, each library (or specific files) only runs in one of the layers, so
       * transformation never doubles up.
       *
       * Libraries that might be exclusively used in test layer:
       *   * jest-runner
       *   * jest-environment-node
       * Libraries that run code in both layers:
       *   * jest-circus
       */
      // dbuxJs: null,
      dbuxArgs: [
        cfg.dbuxArgs,
        '--pw=jest[-]circus,jest[-]runner,jest[-]runtime,jest[-]environment[-]node,jest[-]jasmine2', //,@jest/core',
        //   /**
        //    * babel, debug, pirates, resolve, import, jest-resolve, jest-runtime, @jest/transform, regenerator-transform, source-map*: very likely to mess things up.
        //    * human-signals, jest-haste-map, safe-buffer: caused weird problems?
        //    * gensync: seems to be connected to regenerator-transform?
        //    * graceful-fs: messy polyfilles
        //    * 
        //    * Uninteresting libraries:
        //    * browserslist, react-is
        //    * jsesc: data conversion
        //    */
        //   // eslint-disable-next-line max-len
        //   '--pb=babel[-].*,graceful[-]fs,require.*,resolve.*,import.*,locate.*,pretty[-]format,jest[-]config,jest[-]validate,jest[-]resolve.*,jest[-]runtime,@jest/transform,regenerator[-]transform,.*source[-]map,browserslist,human[-]signals,react[-]is,jest[-]haste[-]map,@jest/reporters,debug,pirates,jsesc,gensync,safe-buffer',
        //   '--fw=.*',
        //   '--fb=requireOrImportModule\\.js',
        //   // '--runtime="{\\"tracesDisabled\\":1}"'
      ].join(' ')
    };

    /**
     * NOTES
     * 
     * 1. node_modules/jest-util/build/index.js:38 getter might cause infinite loop (but does not for now)
     */

    return buildJestRunBugCommand(cfg);
  }
}
