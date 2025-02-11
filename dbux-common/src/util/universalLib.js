/**
 * This file contains some utilities and definitions to run code, independent of environment.
 * 
 * @file
 */

import isFunction from 'lodash/isFunction';
import isString from 'lodash/isString';

const Global = this || globalThis;

export default function universalLib(globalName, fallbackNameOrCb) {
  if (globalName && globalName in Global) {
    return Global[globalName];
  }

  try {
    if (isFunction(fallbackNameOrCb)) {
      // cb
      return fallbackNameOrCb();
    }
    else if (isString(fallbackNameOrCb)) {
      // name
      return _require(fallbackNameOrCb);
    }
  }
  catch (err) {
    throw new Error(`could not load library ${globalName} --\n  ${err}`);
  }
  throw new Error(`invalid use of universalLib. fallbackNameOrCb should be string or function but was: ${fallbackNameOrCb}`);
}

/**
 * @see https://stackoverflow.com/a/35813135
 */
export function isEnvNode() {
  return (typeof process !== 'undefined') && (process.release?.name === 'node');
}

/**
 * Export some globals usually available in browser environments.
 * If not available, will try to load it using a (usually node-specific) callback.
 */

/**
 * Custom require function to make webpack "happy".
 */
let __r;
export function _require(name) {
  // eslint-disable-next-line no-eval
  const _r = __r || (__r = eval(`
    ((typeof __non_webpack_require__ !== 'undefined' && __non_webpack_require__) || 
    (typeof require !== 'undefined' && require))
  `)) || null;
  if (!_r) {
    return null;
  }
  let m = _r(name);
  const Module = _r('module');
  if (m instanceof Module) {
    /**
     * Require might return a module object, rather than its exported content in an ESM context.
     * @see https://nodejs.org/api/module.html#the-module-object
     */
    m = m.default;
  }
  return m;
}

/**
 * @example `performance.now()`
 */
export const performance = universalLib('performance', () => {
  const lib = _require('perf_hooks');
  return lib.performance;
});

/**
 * 
 */
export const util = universalLib(null, 'util');

/**
 * 
 */
export const crypto = universalLib(null, 'crypto');


// NOTE: inspect does not exist in the browser
// /**
//  * @example `inspect(something, inspectOptions)`
//  */
// export const inspect = universalLib('inspect', () => {
//   const lib = _require('util');
//   return lib.inspect;
// });


// const inspectOptions = { depth: 0, colors: true };
//   function _inspect(arg) {
//   const f = typeof window !== 'undefined' && window.inspect ? window.inspect : require('util').inspect;
//   return f(arg, inspectOptions);
// }