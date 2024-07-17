import * as Events from "events";
export class PauseTaskLine {
  isPause: boolean = false;
  isCanel: boolean = false;
  isRunning: boolean = false;
  events: Events = new Events();
  private task: null | AsyncGenerator = null;
  private nextValueRes: any;
  constructor(taskFunc: () => AsyncGenerator) {
    this.task = taskFunc();
  }
  async run(): Promise<boolean> {
    if (this.isCanel) {
      throw new Error("the task is be canceled");
    }
    try {
      this.isRunning = true;
      while (true) {
        const { value, done } = await this.task.next(this.nextValueRes);
        this.nextValueRes = value;
        if (this.isCanel) {
          this.events.emit("canel");
          break;
        }
        if (this.isPause) {
          this.events.emit("pause");
          break;
        }
        if (done) {
          break;
        }
      }
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
