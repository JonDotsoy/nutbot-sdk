import { WrapAPI } from "./WrapAPI";
import { Config } from "./config";

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
      const job = await this.consumeJob();
      if (job) yield job;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

export class Job {
  constructor(
    private wrapAPI: WrapAPI,
    readonly workflowId: string,
    readonly jobId: string,
  ) {}

  async reactive() {
    return this.wrapAPI.sapi("reactiveJob", {
      workflowId: this.workflowId,
      jobId: this.jobId,
    });
  }

  async active() {
    // let t : any
    // while(true) {
    //   await this.reactive();
    //   await new Promise(r => {
    //     t = 
    //   })
    // }
  }

  async updateStatus(status: string) {
    await this.wrapAPI.sapi("updateStatusJob", {
      workflowId: this.workflowId,
      jobId: this.jobId,
      status,
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
