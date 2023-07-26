import { inspect } from "node:util";
import { WrapAPI } from "./WrapAPI";
import { Config } from "./config";

let rejectsMemoro: string[] = [];

export const onceByKey = <T>(ex: T, cb: (ex: T) => void): void => {
  const label = inspect(ex);
  if (rejectsMemoro.includes(label)) {
    return;
  }
  rejectsMemoro = [...rejectsMemoro.slice(1, 50), label];
  cb(ex);
};

export class Workflow {
  constructor(private wrapAPI: WrapAPI, readonly workflowId: string) {}

  async consumeJob() {
    const res = await this.wrapAPI.sapi("consumeJob", {
      workflowId: this.workflowId,
    });

    if (!res) return null;

    return new Job(this.wrapAPI, this.workflowId, res.id);
  }

  async *consumeJobIterable() {
    while (true) {
      try {
        const job = await this.consumeJob();
        if (job) yield job;
        await new Promise((r) => setTimeout(r, 200));
      } catch (ex) {
        onceByKey(ex, console.error);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

export interface PayloadLog {
  kind: "LOG" | "ERR";
  uid: string;
  message: string;
}

export class PayloadLogSync {
  logs: PayloadLog[] = [];
  promise: Promise<void> | null = null;

  constructor(
    readonly limit: number = 50,
    readonly subscribePush: (logs: PayloadLog[]) => Promise<void>,
  ) {}

  async callSubscribePush() {
    let attemptsRejects = 0;
    while (true) {
      try {
        const itemsToPush = this.logs.slice(0, this.limit);
        await this.subscribePush(itemsToPush);
        this.logs = this.logs.slice(itemsToPush.length);
      } catch (ex) {
        attemptsRejects += 1;
        onceByKey(ex, console.error);
        if (attemptsRejects > 20) break;
      } finally {
        // clean store promise
        if (!this.logs.length) {
          break;
        }
      }
    }

    this.promise = null;
  }

  dispatch() {
    if (!this.promise) {
      this.promise = this.callSubscribePush();
    }
  }

  push(...items: PayloadLog[]) {
    this.logs.push(...items);
    this.dispatch();
  }
}

export class Job {
  constructor(
    private wrapAPI: WrapAPI,
    readonly workflowId: string,
    readonly jobId: string,
  ) {}

  payloadLogSync = new PayloadLogSync(50, async (logs) => {
    await this.wrapAPI.sapi("stream_logs", logs);
  });

  async reactive() {
    return this.wrapAPI.sapi("reactiveJob", {
      workflowId: this.workflowId,
      jobId: this.jobId,
    });
  }

  async active() {}

  async updateStatus(status: string) {
    await this.wrapAPI.sapi("updateStatusJob", {
      workflowId: this.workflowId,
      jobId: this.jobId,
      status,
    });
  }

  pushLog(kind: "LOG" | "ERR", uid: string, message: string) {
    this.payloadLogSync.push({
      kind,
      uid,
      message,
    });
  }
}

export class NutbotSDK {
  wrapApi: WrapAPI;
  workflow?: Workflow;
  currentJob?: Job;

  constructor(private config: Config) {
    if (!config.dsn) {
      throw new Error(`Invalid DSN, current value ${config.dsn}`);
    }
    const url = new URL(config.dsn);
    this.wrapApi = new WrapAPI({ baseUrl: url });
    const workflowId = url.searchParams.get("workflow_id");
    if (workflowId) {
      this.workflow = new Workflow(this.wrapApi, workflowId);
      const jobId = url.searchParams.get("job_id");
      if (jobId) {
        this.currentJob = new Job(this.wrapApi, workflowId, jobId);
      }
    }
  }
}
