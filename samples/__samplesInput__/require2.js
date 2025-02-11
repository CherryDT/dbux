/**
node --enable-source-maps --stack-trace-limit=1000 -r "@dbux/runtime" "../../node_modules/@dbux/cli/bin/dbux.js" run --esnext ".\require2.js" --pw=my-test-module-1,my-test-module-2,my-test-module-3 --verbose=2
npx dbux run --esnext ".\require2.js" --pw=my-test-module-1,my-test-module-2,my-test-module-3 --verbose=1
npx dbux run --esnext ".\require2.js" --pb=.* --verbose=1
 */

const path = require('path');
const fs = require('fs');
const sh = require('shelljs');

function testRequire(i) {
  const moduleName = 'my-test-module-' + i;
  const targetDir = path.join(__dirname, 'node_modules', moduleName);
  const targetFile = path.join(targetDir, 'index.js');

  if (!fs.existsSync(targetFile)) {
    sh.mkdir('-p', targetDir);
    fs.writeFileSync(targetFile, `console.log("hi!"); module.exports = { x: ${i} };`);
  }

  const x = require(moduleName).x;
  console.log(x, x === i);
}

for (let i = 0; i < 5; ++i) {
  testRequire(i);
}
