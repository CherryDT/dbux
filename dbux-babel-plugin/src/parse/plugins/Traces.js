// import { NodePath } from '@babel/traverse';
// import DataNodeType from '@dbux/common/src/types/constants/DataNodeType';
// import TraceType from '@dbux/common/src/types/constants/TraceType';
// import EmptyArray from '@dbux/common/src/util/EmptyArray';
// import omit from 'lodash/omit';
import TraceType, { isDeclarationTrace } from '@dbux/common/src/types/constants/TraceType';
import NestedError from '@dbux/common/src/NestedError';
import EmptyArray from '@dbux/common/src/util/EmptyArray';
import EmptyObject from '@dbux/common/src/util/EmptyObject';
import TraceCfg from '../../definitions/TraceCfg';
import { pathToString, pathToStringAnnotated } from '../../helpers/pathHelpers';
import { instrumentExpression, instrumentHoisted } from '../../instrumentation/instrumentMisc';
// import { pathToString } from '../../helpers/pathHelpers';
import BasePlugin from './BasePlugin';

/** @typedef { import("../BaseNode").default } BaseNode */

const makeDefaultTrace = {
  // Literal(path) {
  // }
};

export default class Traces extends BasePlugin {
  /**
   * Special declaration traces that will be hoisted to scope of this.node.
   */
  hoistedTraces = [];

  /**
   * Traces that will be instrumented in order.
   */
  traces = [];

  declaredIdentifiers = [];

  // ###########################################################################
  // simplified declarations
  // ###########################################################################

  getAncestorContextNode() {
    let contextNode = this.node.peekContextNode();
    const contextBodyPath = contextNode.path.get('body');
    let { scope } = contextNode.path;

    // make sure that `this.node` is actually in `body` of the scope where we want to create the variable
    if ((!contextBodyPath ||
      (contextNode !== this.node && contextBodyPath.isAncestor && !contextBodyPath.isAncestor(this.node.path))) &&
      scope.parent) {
      // TODO: maybe there might be bugs here, e.g. in computed class property keys:
      //      -> e.g. var X = 0; function otherA() { return otherA || (otherA = new A()); }; class A { x = ++X; [otherA().x]() {} }; new A();

      // scope = scope.parent;
      // scope = scope.getFunctionParent() || scope.getProgramParent();
      contextNode = contextNode.getExistingParent().peekContextNode();
    }
    return contextNode;
  }

  generateDeclaredUidIdentifier(name) {
    const contextNode = this.getAncestorContextNode();
    const { scope } = contextNode.path;

    const id = scope.generateUidIdentifier(name);

    contextNode.Traces.declaredIdentifiers.push(id);
    // console.debug('generateDeclaredUidIdentifier', id.name, `[${scope.path.node?.type}]`, pathToString(scope.path));
    return id;
  }

  getOrGenerateUniqueIdentifier(name) {
    const contextNode = this.getAncestorContextNode();
    const id = contextNode.StaticContext.getOrGenerateUniqueIdentifier(name);
    contextNode.Traces.declaredIdentifiers.push(id);
    // console.debug('generateDeclaredUidIdentifier', id.name, `[${scope.path.node?.type}]`, pathToString(scope.path));
    return id;
  }

  getUniqueIdentifier(name) {
    const contextNode = this.getAncestorContextNode();
    return contextNode.StaticContext.getUniqueIdentifier(name);
  }


  // ###########################################################################
  // trace inputs
  // ###########################################################################

  addDefaultTrace = (path) => {
    const node = this.node.getNodeOfPath(path);
    if (!node) {
      // handle some (basic) default AST node types
      const traceData = makeDefaultTrace[path.node.type]?.(path);
      if (!traceData) {
        if (this.node.state.verbose.nyi) {
          this.node.logger.warn(`[NYI] Could not addDefaultTrace for unknown AST node type "${path.node.type}", path: ${pathToString(path)}`);
        }
        return null;
      }
      return this.addTrace(traceData);
    }
    else {
      return node.addDefaultTrace();
    }
  }

  /**
   * NOTE: we assume inputs to be RVals.
   */
  addDefaultTraces(inputPaths) {
    return inputPaths.flat()
      .map(this.addDefaultTrace)
      .filter(node => !!node);
  }

  // ###########################################################################
  // addTrace
  // ###########################################################################

  /**
   * @return {TraceCfg}
   */
  addTrace(traceData) {
    if (Array.isArray(traceData)) {
      for (const t of traceData) {
        this.addTrace(t);
      }
      return null;
    }


    let {
      path,
      node,
      scope,
      staticTraceData,
      inputTraces,
      meta,
      data
    } = traceData;

    if (!path || !staticTraceData) {
      throw new Error(
        `addTrace data missing \`path\` or \`staticTraceData\`: node=${node}, path=${path && pathToString(path)}, staticTraceData=${JSON.stringify(staticTraceData)}`
      );
    }

    const isDeclaration = isDeclarationTrace(staticTraceData.type);
    const declarationNode = isDeclaration && node.getOwnDeclarationNode();
    const isRedeclaration = !!declarationNode?.bindingTrace;
    if (isRedeclaration) {
      meta = meta || {};
      meta.isRedeclaration = true;
      // meta.redeclarationTid = declarationNode.bindingTrace;
    }

    // set default static DataNode
    staticTraceData.dataNode = staticTraceData.dataNode || { isNew: false };

    const { state } = this.node;
    const inProgramStaticTraceId = state.traces.addTrace(path, staticTraceData);

    // NOTE: `scope.push` happens during `instrument`
    scope = scope || path.scope;
    let tidIdentifier;

    if (!meta?.noTidIdentifier) {
      tidIdentifier = scope.generateUidIdentifier(`t${inProgramStaticTraceId}_`);
    }

    const traceCfg = {
      path,
      node,
      scope,
      staticTraceData,
      inProgramStaticTraceId,
      tidIdentifier,
      isDeclaration,
      inputTraces,
      meta,
      data
    };

    if (isDeclaration) {
      if (!declarationNode) {
        node.getOwnDeclarationNode();
        throw new Error(`Assertion failed - node.getOwnDeclarationNode() returned nothing ` +
          `for Declaration "${node}" in "${node.getParentString()}`);
      }

      // eslint-disable-next-line max-len
      // console.warn(`addTrace (Declaration): [${declarationNode.path.parentPath.node.type}] ${pathToString(path, true)}, addTo: ${this.node.path.node.type} (scope=${scope.path.node.type}, decl=${declarationNode})`, JSON.stringify(declarationNode.path.node));

      if (isRedeclaration) {
        // this is a re-definition of var, function, class etc.
        //    -> make sure not to create a separate declarationTid
      }
      else {
        declarationNode.bindingTrace = traceCfg;
      }

      // if (meta?.hoisted && !isRedeclaration) {

      // eslint-disable-next-line max-len
      this.Verbose && this.debug(`DECL "${declarationNode}" in "${declarationNode.getParentString()}" by "${node}" in "${node.getParentString()}" (${traceCfg.tidIdentifier.name})`);
    }
    else {
      // not a declaration
    }

    if (meta?.hoisted) {
      this.hoistedTraces.push(traceCfg);
    }
    else {
      this.traces.push(traceCfg);
    }

    if (node && !node._traceCfg) {
      node._setTraceCfg(traceCfg);
    }

    this.Verbose >= 2 && this.debug('[addTrace]', tidIdentifier?.name, `([${inputTraces?.map(tid => tid.name).join(',') || ''}])`, `@"${this.node}"`);

    return traceCfg;
  }

  // ###########################################################################
  // addDefaultDeclarationTrace
  // ###########################################################################

  /**
   * @param {BindingIdentifier} id
   */
  addDefaultDeclarationTrace(id, valuePathOrNode, moreTraceData = null) {
    moreTraceData = moreTraceData || {};
    moreTraceData.staticTraceData = moreTraceData.staticTraceData || {
      type: TraceType.Declaration,
      dataNode: {
        // NOTE: Most declarations are hoisted to some scope, always assigned a "new" value (`undefined`, if `valueNode` not given)
        //      Notable exception: `param`.
        isNew: true
      }
    };

    const traceData = {
      path: id.path,
      node: id,
      ...moreTraceData
    };
    return this.addDeclarationTrace(traceData, valuePathOrNode);
  }

  addDeclarationTrace(traceData, valuePathOrNode) {
    traceData.meta = traceData.meta || {};

    if (valuePathOrNode) {
      traceData.meta.targetNode = valuePathOrNode.node || valuePathOrNode;
    }

    // `meta.hoisted`
    if (!('hoisted' in traceData.meta)) {
      traceData.meta.hoisted = true;
    }

    const traceCfg = this.addTrace(traceData);

    return traceCfg;
  }

  // ###########################################################################
  // addReturnTrace, addThrowTrace
  // ###########################################################################

  /**
   * @param {BaseNode} node 
   */
  addReturnTrace(func, node, path, argPath) {
    const hasArgument = !!argPath.node;
    const traceCall = func?.isAsync ? 'traceReturnAsync' : 'traceReturn';

    const traceData = {
      node,
      path,
      staticTraceData: {
        type: hasArgument ? TraceType.ReturnArgument : TraceType.ReturnNoArgument,
      },
      meta: {
        traceCall,
        targetPath: argPath
      }
    };

    return this.addTraceWithInputs(traceData, hasArgument && [argPath] || EmptyArray);
  }

  // ###########################################################################
  // addTraceWithInputs
  // ###########################################################################

  addTraceWithInputs(traceData, inputPaths) {
    // add trace for inputTraces if they don't have any yet
    // NOTE: especially for `Literal` or `ReferencedIdentifier`
    const inputTraces = this.addDefaultTraces(inputPaths);
    return this.addTraceWithInputTraceCfgs(traceData, inputTraces);
  }

  addTraceWithInputTraceCfgs(traceData, inputTraceCfgs) {
    traceData.inputTraces = inputTraceCfgs;
    return this.addTrace(traceData);
  }

  // exit() {
  // }

  // ###########################################################################
  // instrument
  // ###########################################################################

  instrumentHoisted = (traceCfgs) => {
    const { node } = this;
    const { state } = node;

    if (traceCfgs.length) {
      instrumentHoisted(node.path, state, traceCfgs);
    }
  }

  instrument() {
    const { node, traces, hoistedTraces } = this;

    for (const id of this.declaredIdentifiers) {
      this.node.path.scope.push({ id });
    }

    // this.debug(`traces`, traces.map(t => t.tidIdentifier));
    this.instrumentHoisted(hoistedTraces);

    for (const traceCfg of traces) {
      // add variable to scope
      const {
        /* inProgramStaticTraceId, */
        path,
        tidIdentifier,
        scope,
        staticTraceData: { type: traceType },
        meta: {
          preInstrument,
          instrument = instrumentExpression
        } = EmptyObject
      } = traceCfg;

      // make sure, tidIdentifier gets declared
      if (tidIdentifier) {
        scope.push({
          id: tidIdentifier
        });
      }

      // instrument?.(traceCfg);
      const { state } = node;

      try {
        preInstrument?.(state, traceCfg);
        instrument?.(state, traceCfg);
        this.Verbose > 1 && this.debug(` ins [${TraceType.nameFromForce(traceType)}] -> ${pathToString(path)}`);
      }
      catch (err) {
        let msg = '';
        if (err.message === 'Container is falsy') {
          // NOTE: this usually means that `getInstrumentPath(traceCfg)` has been instrumented already
          // (similar fix for bug in other project https://github.com/ember-cli/babel-plugin-ember-modules-api-polyfill/pull/156/files)
          msg = ' (possible incompatability with other plugins/presets)';
        }
        // eslint-disable-next-line max-len
        throw new NestedError(`Failed to instrument node="${node.debugTag}", path="${pathToStringAnnotated(path, true)}", trace=${TraceType.nameFromForce(traceType)}${msg}`, err);
      }
    }
  }
}