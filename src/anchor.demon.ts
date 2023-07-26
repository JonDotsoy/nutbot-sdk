import { URLPattern } from "urlpattern-polyfill";
import { spawn } from "node:child_process";
import { json, LiteHTTP } from "./lite-http";
import { symbol, z } from "zod";
import cluster from "node:cluster";
import * as handlers from "./anchor.demon/handlers";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { ulid } from "ulid";
import {
  demonIDPath,
  demonPIDPath,
  logsPath,
  nutbotAnchorPath,
  workerErrorLogPath,
  workerLogPath,
} from "./anchor-paths";
import { setWorkerId } from "./worker.utils";

cluster.setupPrimary?.({ silent: true });

export class AnchorDemon {
  demonLogPath = process.env.ANCHOR_DEMON_LOGS
  demonErrorLogPath = process.env.ANCHOR_DEMON_ERROR_LOGS

  getWorker = () => {
    const id = ulid();
    const worker = cluster.fork();

    setWorkerId(worker, id);

    mkdirSync(new URL(".", logsPath), { recursive: true });

    worker.addListener("exit", (code, signal) => {
      console.log(
        `Worker ${worker.process.pid} closed. Exit code: ${code}, signal: ${signal}`,
      );
    });

    worker.addListener("online", () => {
      console.log(`Worker online id: ${id} pid; ${worker.process.pid}`);

      writeFileSync(
        demonPIDPath,
        `${worker.process.pid}`,
      );
      writeFileSync(demonIDPath, `${id}`);

      worker.process.stdout?.pipe(
        createWriteStream(
          workerLogPath(id),
        ),
      );
      worker.process.stderr?.pipe(
        createWriteStream(
          workerErrorLogPath(id),
        ),
      );
    });

    return worker;
  };

  worker = this.getWorker();
  readonly http = new LiteHTTP();

  api = this.http.api.bind(this.http);

  constructor() {}

  async listen() {
    await this.http.listen();
  }
}

const main = async () => {
  const anchorDemon = new AnchorDemon();

  for (const { default: handler } of Object.values(handlers)) {
    await handler(anchorDemon);
  }

  await anchorDemon.listen();
  console.log(`Server ready on ${anchorDemon.http.toURL()}`);
};

const mainFork = async () => {
  await import("./anchor");
};

if (cluster.isPrimary) {
  main();
} else {
  mainFork();
}
