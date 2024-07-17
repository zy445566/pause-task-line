# pause-task-line

Pausing task pipeline

## Installation

```
$ npm install pause-task-line
```

## Examples

```js
const { PauseTaskLine } = require("pause-task-line");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}
// Cancel example
let testPosion = 0;
const taskCancelLine = new PauseTaskLine(async function* () {
  const time = yield await sleep(500);
  console.log(time); // output: 500
  testPosion++;
  yield await sleep(500);
  testPosion++;
  yield await sleep(500);
  testPosion++;
});
await Promise.all([
  taskCancelLine.run(),
  (async () => {
    await sleep(600);
    await taskCancelLine.cancel();
    await sleep(2000);
    console.log(testPosion); // output: 1
  })(),
]);

// pause and resume example
const taskPauseLine = new PauseTaskLine(async function* () {
  yield await sleep(500);
  yield await sleep(500);
  yield await sleep(500);
});
await Promise.all([
  taskPauseLine.run(),
  (async () => {
    await sleep(600);
    // pause this task
    await taskPauseLine.pause();
    // doSomeThing then resume
    await taskPauseLine.resume();
  })(),
]);

// nest sub task example
const taskSubLine = new PauseTaskLine(async function* () {
  yield await sleep(500);
  testPosion++;
  // sub task
  yield await (async function* () {
    yield await sleep(500);
    testPosion++;
    yield await sleep(500);
    testPosion++;
  })();
  yield await sleep(500);
  testPosion++;
});
await Promise.all([
  taskSubLine.run(),
  (async () => {
    await sleep(1100);
    await taskSubLine.cancel();
    await sleep(1100);
    console.log(testPosion); // output: 2
  })(),
]);
```
