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
      logsPath: z.string(),
      errorLogsPath: z.string(),
      logs: z.string(),
      error_logs: z.string(),
    }),
    async (input) => {
      const workerId = input?.workerId ?? getWorkerId(anchorDemon.worker);
      const logsPath = workerLogPath(workerId);
      const errorLogsPath = workerErrorLogPath(workerId);
      return {
        logsPath: logsPath.toString(),
        errorLogsPath: errorLogsPath.toString(),
        logs: await readFile(logsPath, "utf-8"),
        error_logs: await readFile(errorLogsPath, "utf-8"),
      };
    },
  );
