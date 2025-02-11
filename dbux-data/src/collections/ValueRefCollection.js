import ValueTypeCategory, { isObjectCategory, ValuePruneState } from '@dbux/common/src/types/constants/ValueTypeCategory';
import ValueRef from '@dbux/common/src/types/ValueRef';
import Collection from '../Collection';

/**
 * @extends {Collection<ValueRef>}
 */
export default class ValueRefCollection extends Collection {
  _visited = new Set();

  constructor(dp) {
    super('values', dp);
  }

  postAddRaw(entries) {
    // deserialize
    this.errorWrapMethod('deserializeShallow', entries);
  }

  getAllById(ids) {
    return ids.map(id => this.getById(id));
  }

  deserializeShallow(valueRefs) {
    for (let valueRef of valueRefs) {
      if (!valueRef) {
        this.logger.warn(`invalid ValueCollection: contains empty values`);
        continue;
      }
      if (!('value' in valueRef)) {
        const {
          nodeId: childNodeId,
          category,
          serialized,
          pruneState
        } = valueRef;

        if (pruneState !== ValuePruneState.Omitted && isObjectCategory(category) && serialized) {
          // map: [childRefId, childValue] => [(creation)nodeId, childRefId, childValue]
          // TODO: `childNodeId` should be that of `childRef`, but we don't have a unique `nodeId` for refs whose explicit creation we have not recorded
          valueRef.value = Object.fromEntries(
            Object.entries(serialized)
              .map(([key, [childRefId, childValue]]) => [key, [childNodeId, childRefId, childValue]])
          );
        }
        else {
          valueRef.value = serialized;
        }
        delete valueRef.serialized;
      }
    }
  }
}