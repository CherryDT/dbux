/**
 * @file similar to semantics of `queue._maybeDrain` in async-js
 * A3 syncs against future event
 * which is scheduled in B4.
 */
import { P } from '../../util/asyncUtil';

let cb;

const p = P('S1', () => new Promise((r) => {
  'S2';
  cb = () => {
    r();
  };
}));


// queue user
P(
  'A1',
  () => ('A2', p),
  () => 'A3',
);


// queue driver
P(
  'B1',
  'B2',
  'B3',
  () => ('B4', setImmediate(cb)),
  // () => new Promise((r) => setImmediate(() => {
  //   cb();
  //   r();
  // })),
  'B5'
);