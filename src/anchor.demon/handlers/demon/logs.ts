import { z } from "zod";
import { AnchorDemon } from "../../../anchor.demon";
import { workerErrorLogPath, workerLogPath } from "../../../anchor-paths";
import { getWorkerId } from "../../../worker.utils";
import { readFile } from "fs/promises";

export default (anchorDemon: AnchorDemon) =>
  anchorDemon.api(
    "demon_logs",
    new URLPattern({ pathname: "/demon/logs" }),
    z.void(),
    z.object({
      logs: z.string().optional(),
      error_logs: z.string().optional(),
    }),
    async () => {
      const logsPath = anchorDemon.demonLogPath;
      const errorLogsPath = anchorDemon.demonErrorLogPath;
      return {
        logs: logsPath ? await readFile(logsPath, "utf-8") : undefined,
        error_logs: errorLogsPath
          ? await readFile(errorLogsPath, "utf-8")
          : undefined,
      };
    },
  );
