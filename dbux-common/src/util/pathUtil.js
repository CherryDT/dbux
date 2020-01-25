/**
 * Flexible `basename` implementation
 * 
 * @see https://stackoverflow.com/a/59907288/2228771
 */
export function getBasename(path: string) {
  // make sure the basename is not empty, if string ends with separator
  let end = path.length-1;
  while (path[end] === '/' || path[end] === '\\') {
    --end;
  }

  // support Win + Unix path separator
  const i1 = path.lastIndexOf('/', end);
  const i2 = path.lastIndexOf('\\', end);

  let start;
  if (i1 === -1) {
    if (i2 === -1) {
      // no separator in the whole thing
      return path;
    }
    start = i2;
  }
  else if (i2 === -1) {
    start = i1;
  }
  else {
    start = Math.max(i1, i2);
  }
  return path.substring(start+1, end+1);
}

// tests
console.table([
  ['a/b/c', 'c'],
  ['a/b/c//', 'c'],
  ['a\\b\\c', 'c'],
  ['a\\b\\c\\', 'c'],
  ['a\\b\\c/', 'c'],
  ['a/b/c\\', 'c'],
  ['c', 'c']
].map(([input, expected]) => {
  const result = getBasename(input);
  return {
    input, 
    result,
    expected,
    good: result === expected ? '✅' : '❌'
  };
}));