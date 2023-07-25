import { z } from "zod";
import { AnchorDemon } from "../../../anchor.demon";

export default (anchorDemon: AnchorDemon) =>
  anchorDemon.api(
    "worker_status",
    new URLPattern({ pathname: "/worker/status" }),
    z.void(),
    z.object({
      isConnected: z.boolean(),
      isDead: z.boolean(),
      pid: z.number().optional(),
      exitCode: z.number().nullable(),
    }),
    () => ({
      isConnected: anchorDemon.worker.isConnected(),
      isDead: anchorDemon.worker.isDead(),
      pid: anchorDemon.worker.process.pid,
      exitCode: anchorDemon.worker.process.exitCode,
    }),
  );
