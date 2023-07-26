import { z } from "zod";
import { AnchorDemon } from "../../../anchor.demon";
import { workerErrorLogPath, workerLogPath } from "../../../anchor-paths";
import { getWorkerId } from "../../../worker.utils";
import { readFile } from "fs/promises";

export default (anchorDemon: AnchorDemon) =>
  anchorDemon.api(
    "worker_logs",
    new URLPattern({ pathname: "/worker/logs" }),
    z.union([
      z.undefined().nullable(),
      z.object({ workerId: z.string().optional().nullable() }),
    ]),
    z.object({
      logs: z.string(),
      error_logs: z.string(),
    }),
    async (input) => {
      const workerId = input?.workerId ?? getWorkerId(anchorDemon.worker);
      const logsPath = workerLogPath(workerId);
      const errorLogsPath = workerErrorLogPath(workerId);
      return {
        logs: await readFile(logsPath, "utf-8"),
        error_logs: await readFile(errorLogsPath, "utf-8"),
      };
    },
  );
