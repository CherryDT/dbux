import AsyncEdgeType from '@dbux/common/src/types/constants/AsyncEdgeType';
import CollectionIndex from '../../indexes/CollectionIndex';

/** @typedef {import('@dbux/common/src/types/AsyncEvent').default} AsyncEvent */
/** @typedef {import('../../RuntimeDataProvider').default} RuntimeDataProvider */

/** @extends {CollectionIndex<AsyncEvent>} */
export default class SyncOutAsyncEventsByRootIndex extends CollectionIndex {
  constructor() {
    super('asyncEvents', 'syncOutByRoot');
  }

  /** 
   * @param {RuntimeDataProvider} dp
   * @param {AsyncEvent} asyncEvent
   */
  makeKey(dp, asyncEvent) {
    if (asyncEvent.edgeType === AsyncEdgeType.SyncOut) {
      return asyncEvent.fromRootContextId;
    }
    return false;
  }
}