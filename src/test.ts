import * as assert from "assert";
import { PauseTaskLine } from "./index";

function sleep(ms): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}

const testUnit = {
  [Symbol("test.result")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {
      const result = yield await Promise.resolve(true);
      assert.equal(result, true, "test.result.error");
    });
    await taskLine.run();
  },
  [Symbol("test.doSomeThing")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {
      const result = yield await sleep(500);
      assert.equal(result, 500, "test.result.doSomeThing");
    });
    await taskLine.run();
  },
  [Symbol("test.doSomeThing.common")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {
      yield await sleep(500);
      yield await sleep(500);
      yield await sleep(500);
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(600);
        await taskLine.pause();
        assert.equal(
          taskLine.isPause,
          true,
          "test.doSomeThing.common.pause.error"
        );
        await taskLine.resume();
        assert.equal(
          taskLine.isPause,
          false,
          "test.doSomeThing.common.resume.error"
        );
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.action")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      yield await sleep(500);
      testPosion++;
      yield await sleep(500);
      testPosion++;
      yield await sleep(500);
      testPosion++;
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(600);
        await taskLine.cancel();
        await sleep(2000);
        assert.equal(testPosion, 1, "test.doSomeThing.action.error");
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.throw")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      testPosion = 1;
      throw new Error("A_Error");
    });
    try {
      await Promise.all([
        taskLine.run(),
        (async () => {
          await sleep(600);
          assert.equal(testPosion, 2, "test.doSomeThing.throw.error");
        })(),
      ]);
    } catch (error) {
      assert.equal(error.message, "A_Error", "test.doSomeThing.throw.error");
      assert.equal(testPosion, 1, "test.doSomeThing.throw.error");
    }
  },
  [Symbol("test.doSomeThing.nest.action")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      testPosion += Number(yield await sleep(500));
      yield await (async function* () {
        testPosion += yield await sleep(501);
        testPosion += yield await sleep(502);
      })();
      testPosion += Number(yield await sleep(500));
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(1100);
        await taskLine.cancel();
        assert.equal(testPosion, 1001, "test.doSomeThing.nest.action.error");
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.nest.action.throw")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      testPosion += Number(yield await sleep(500));
      yield await (async function* () {
        testPosion += yield await sleep(501);
        throw new Error("A_Error");
      })();
      testPosion += Number(yield await sleep(500));
    });
    try {
      await Promise.all([
        taskLine.run(),
        (async () => {
          await sleep(1100);
          assert.equal(
            testPosion,
            1002,
            "test.doSomeThing.nest.action.throw.error"
          );
        })(),
      ]);
    } catch (error) {
      assert.equal(
        error.message,
        "A_Error",
        "test.doSomeThing.nest.action.throw.error"
      );
      assert.equal(
        testPosion,
        1001,
        "test.doSomeThing.nest.action.throw.error"
      );
    }
  },
  [Symbol("test.doSomeThing.nest.puase.action")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      testPosion += Number(yield await sleep(500));
      yield await (async function* () {
        testPosion += yield await sleep(501);
        testPosion += yield await sleep(502);
      })();
      testPosion += Number(yield await sleep(500));
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(501);
        await taskLine.pause();
        await sleep(300);
        await taskLine.resume();
        assert.equal(
          testPosion,
          2003,
          "test.doSomeThing.nest.puase.action.error"
        );
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.nest.resume.action")]: async function () {
    let testPosion = 0;
    const taskLine = new PauseTaskLine(async function* () {
      testPosion += Number(yield await sleep(500));
      yield await (async function* () {
        testPosion += yield await sleep(501);
        testPosion += yield await sleep(502);
      })();
      testPosion += Number(yield await sleep(500));
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(1100);
        await taskLine.pause();
        await taskLine.resume();
        assert.equal(
          testPosion,
          2003,
          "test.doSomeThing.nest.resume.action.error"
        );
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.nest.pause.cancel.resume.action")]:
    async function () {
      let testPosion = 0;
      const taskLine = new PauseTaskLine(async function* () {
        testPosion += Number(yield await sleep(500));
        yield await (async function* () {
          testPosion += yield await sleep(501);
          testPosion += yield await sleep(502);
        })();
        testPosion += Number(yield await sleep(500));
      });
      await Promise.all([
        taskLine.run(),
        (async () => {
          await sleep(1100);
          await Promise.all([taskLine.cancel(), taskLine.pause()]);
          try {
            await taskLine.resume();
          } catch (error) {
            assert.equal(
              error.message,
              "the task is not be pasuse",
              "test.doSomeThing.nest.pause.cancel.resume.action.error"
            );
          }
        })(),
      ]);
    },
  [Symbol("test.doSomeThing.cancel.resume")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {
      yield await sleep(500);
      yield await sleep(500);
      yield await sleep(500);
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(600);
        await taskLine.cancel();
        try {
          await taskLine.resume();
        } catch (error) {
          assert.equal(
            error.message,
            "the task is not be pasuse",
            "test.cancel.error.error"
          );
        }
      })(),
    ]);
  },
  [Symbol("test.doSomeThing.cancel.resume")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {
      yield await sleep(500);
      yield await sleep(500);
      yield await sleep(500);
    });
    await Promise.all([
      taskLine.run(),
      (async () => {
        await sleep(600);
        await taskLine.cancel();
        try {
          await taskLine.cancel();
        } catch (error) {
          assert.equal(
            error.message,
            "the task is not runing",
            "test.cancel.error.error"
          );
        }
      })(),
    ]);
  },
  [Symbol("test.pause.error")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {});
    try {
      await taskLine.pause();
    } catch (error) {
      assert.equal(
        error.message,
        "the task is not runing",
        "test.cancel.error.error"
      );
    }
  },
  [Symbol("test.cancel.error")]: async function () {
    const taskLine = new PauseTaskLine(async function* () {});
    try {
      await taskLine.cancel();
    } catch (error) {
      assert.equal(
        error.message,
        "the task is not runing",
        "test.cancel.error.error"
      );
    }
  },
};

async function run(testUnitList) {
  for (let testUnitValue of testUnitList) {
    for (let testFunc of Object.getOwnPropertySymbols(testUnitValue)) {
      await testUnitValue[testFunc]();
    }
  }
}
(async function () {
  await run([testUnit]);
})().catch((error) => {
  console.error(error);
});
