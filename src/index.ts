import * as Events from "events";

function isGenerator(obj): boolean {
  return "function" == typeof obj?.next && "function" == typeof obj?.throw;
}
export class PauseTaskLine {
  isPause: boolean = false;
  isCanel: boolean = false;
  isRunning: boolean = false;
  events: Events = new Events();
  private taskList: Array<AsyncGenerator> = [];
  private nextValueRes: any;
  constructor(taskFunc: () => AsyncGenerator) {
    this.taskList.push(taskFunc());
  }

  private async next() {
    while (this.taskList.length > 0) {
      const asyncGen = this.taskList[this.taskList.length - 1];
      const { value, done } = await asyncGen.next(this.nextValueRes);
      if (this.isCanel) {
        this.events.emit("canel");
        break;
      }
      if (this.isPause) {
        this.events.emit("pause");
        break;
      }
      if (done) {
        this.taskList.pop();
        continue;
      }
      if (isGenerator(value)) {
        this.taskList.push(value);
        this.nextValueRes = undefined;
      } else {
        this.nextValueRes = value;
      }
    }
  }
  async run(): Promise<boolean> {
    if (this.isCanel) {
      throw new Error("the task is be canceled");
    }
    try {
      this.isRunning = true;
      await this.next();
    } finally {
      this.isRunning = false;
    }
    return true;
  }
  async cancel(): Promise<boolean> {
    if (!this.isRunning) {
      throw new Error("the task is not runing");
    }
    return await new Promise((resolve) => {
      this.isCanel = true;
      this.events.once("canel", () => {
        return resolve(this.isCanel);
      });
    });
  }
  async pause(): Promise<boolean> {
    if (!this.isRunning) {
      throw new Error("the task is not runing");
    }
    return await new Promise((resolve) => {
      this.isPause = true;
      this.events.once("pause", () => {
        return resolve(this.isPause);
      });
    });
  }
  async resume(): Promise<boolean> {
    if (!this.isPause) {
      throw new Error("the task is not be pasuse");
    }
    this.isPause = false;
    return await this.run();
  }
}

export default PauseTaskLine;
