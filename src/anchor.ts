#!/usr/bin/env node
import { spawn } from "node:child_process";
import { makeFlags, ShowHelp } from "./utils/make-flags";
import { NutbotSDK } from "./NutbotSDK";
import * as colorette from "colorette";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { createInterface } from "readline";
import { ulid } from "ulid";

const { showHelp, config } = makeFlags(
  {
    showHelp: false as false | string,
    config: pathToFileURL(`${homedir()}/.nutbot-anchor.json`),
  },
  process.argv.slice(2),
  {
    "--config": (options, value) => {
      const nextValue = value();
      if (nextValue) {
        options.config = new URL(nextValue, pathToFileURL(process.cwd()));
      }
    },
    get "-c"() {
      return this["--config"];
    },
    "--help": (options, _value, m) =>
      options.showHelp = ShowHelp("nutbot-anchor", m),
    get "-h"() {
      return this["--help"];
    },
  },
);

const optionSchema = z.object({
  configs: z.array(z.object({
    dsn: z.string(),
    execArgs: z.array(z.string()),
  })),
});

const main = async () => {
  if (showHelp) {
    console.log(showHelp);
    return;
  }

  const payload = optionSchema.parse(
    JSON.parse(await readFile(config, "utf-8")),
  );

  for (const config of payload.configs) {
    await forkWaiting(config.dsn, config.execArgs);
  }
};

const forkWaiting = async (dsn: string, execArgs: string[]) => {
  const nutbot = new NutbotSDK({ dsn });

  if (!nutbot.workflow) throw new Error(`Cannot identified workflow`);

  console.log(
    `Anchor waiting job from workflow ${nutbot.workflow.workflowId} to exec: ${
      execArgs.join(" ")
    }`,
  );

  for await (const job of nutbot.workflow.consumeJobIterable()) {
    console.log(
      `${colorette.blue(`==>`)} ${
        colorette.bold(colorette.black(`run job ${job.jobId}`))
      }`,
    );
    const activity = job.active();

    const [cmd, ...a] = execArgs;
    const p = spawn(cmd, a, { stdio: "pipe" });

    const rl = createInterface({ input: p.stdout });
    const errorRL = createInterface({ input: p.stderr });

    rl.on("line", (line) => {
      console.log(`${new Date().toUTCString()} LOG ${line}`);
      job.pushLog("LOG", ulid(), line);
    });
    errorRL.on(
      "line",
      (line) => {
        console.log(`${new Date().toUTCString()} ERR ${line}`);
        job.pushLog("ERR", ulid(), line);
      },
    );

    try {
      await new Promise<undefined>((resolve, reject) => {
        p.once("close", () => resolve(undefined));
        p.once("error", (err) => reject(err));
      });
      await job.updateStatus("success");
    } catch (ex) {
      console.error(ex);
      await job.updateStatus("rejected");
    }

    await activity;
    console.log(
      `${colorette.blue(`==>`)} ${`finish job ${job.jobId} with exist code ${
        colorette.bold(colorette.black(`${p.exitCode}`))
      }`}`,
    );
  }
};

main().catch((ex) => console.error(ex));
