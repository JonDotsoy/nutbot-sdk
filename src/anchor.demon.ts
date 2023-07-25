import { URLPattern } from "urlpattern-polyfill";
import { spawn } from "node:child_process";
import { json, LiteHTTP } from "./lite-http";
import { z } from "zod";
import cluster from "node:cluster";
import * as handlers from "./anchor.demon/handlers";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { ulid } from "ulid";

cluster.setupPrimary?.({ silent: true });

export class AnchorDemon {
  getWorker = () => {
    const id = ulid();
    const worker = cluster.fork();
    const nutbotAnchorPath = new URL(
      `.nutbot-anchor/`,
      pathToFileURL(`${homedir()}/`),
    );
    const logsPath = new URL(
      `logs/`,
      nutbotAnchorPath,
    );
    mkdirSync(new URL(".", logsPath), { recursive: true });

    worker.addListener("exit", (code, signal) => {
      console.log(
        `Worker ${worker.process.pid} closed. Exit code: ${code}, signal: ${signal}`,
      );
    });

    worker.addListener("online", () => {
      console.log(`Worker online id: ${id} pid; ${worker.process.pid}`);

      writeFileSync(
        new URL("demon.pid", nutbotAnchorPath),
        `${worker.process.pid}`,
      );
      writeFileSync(new URL("demon.id", nutbotAnchorPath), `${id}`);

      worker.process.stdout?.pipe(
        createWriteStream(
          new URL(`${id}-${worker.process.pid}.log`, logsPath),
        ),
      );
      worker.process.stderr?.pipe(
        createWriteStream(
          new URL(`${id}-${worker.process.pid}.error_log`, logsPath),
        ),
      );
      worker.process.stdout?.pipe(
        process.stdout,
      );
      worker.process.stderr?.pipe(
        process.stderr,
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
