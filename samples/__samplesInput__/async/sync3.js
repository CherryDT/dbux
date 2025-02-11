/**
 * Four FORKs: `f` is its own FORK + one FORK per `g`.
 * All `g`s SYNC against `f`.
 */

(async function main() {
  console.log('mainA');
  const p = f();
  await 0;
  console.log('mainB');
  g(1, p);
  g(2, p);
  g(3, p);
  await 1;
  console.log('mainC');
})();

async function f() {
  console.log('fA');
  await 0;
  console.log('fB');
  await 1;
  console.log('fC');
  await 2;
  console.log('fD');
  await 3;
  console.log('fE');
  await 4;
  console.log('fF');
}

async function g(x, p) {
  console.log('gA', x);
  await p;
  console.log('gB', x);
  await 0;
  console.log('gC', x);
}