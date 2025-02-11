
/** @typedef { import("@babel/types").Node } AstNode */
/** @typedef { import("@babel/traverse").NodePath } NodePath */
/** @typedef { import("../parse/BaseNode").default } BaseNode */

export class TraceCfgMeta {
  /**
   * @type {String?}
   */
  traceCall;
  /**
   * @type {Function?}
   */
  build;
  /**
   * @type {Function?}
   */
  instrument;

  /**
   * If given, traceCall will only execute if condition met.
   * @type {AstNode}
   */
  preCondition;

  /**
   * If `false`, it indicates that instrumentation should build, but not store the `trace` call `AstNode`.
   * In that case, it can be accessed via `traceCfg.data.resultNode`
   * @type {(NodePath | false)?}
   */
  targetPath;

  /**
   * @type {Array.<AstNode>}
   */
  moreTraceCallArgs;

  /**
   * If `true`, move to top of scope, else place in order of instrumentation.
   * @type {boolean}
   */
  hoisted;
}

export class TraceCfgData {
  /**
   * @type {AstNode | undefined}
   */
  resultNode;
}


export default class TraceCfg {
  /**
   * @type {NodePath}
   */
  path;

  /**
   * @type {BaseNode}
   */
  node;
  /**
   * @type {number}
   */
  inProgramStaticTraceId;
  /**
   * @type {number}
   */
  tidIdentifier;

  staticTraceData;

  /**
   * @type {Array.<TraceCfg>}
   */
  inputTraces;

  /**
   * Use this to store context-sensitive configuration logic for generic `build` and `instrument` functions.
   * @type {TraceCfgMeta | null}
   */
  meta;

  /**
   * Use this to store context-sensitive configuration logic and data for specialized `build` and `instrument` functions.
   * Is also sometimes used for storing build results.
   * @type {TraceCfgData | null}
   */
  data;
}

/**
 * NOTE: input traces only need a tidIdentifier which is then added to the final `inputs` array which parttakes in a trace call.
 */
export class InputTrace {
  /**
   * @type {number}
   */
  tidIdentifier;
}