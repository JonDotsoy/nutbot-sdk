import { z } from "zod";
import { AnchorDemon } from "../../../anchor.demon";
import { getWorkerId } from "../../../worker.utils";

export default (anchorDemon: AnchorDemon) =>
  anchorDemon.api(
    "worker_status",
    new URLPattern({ pathname: "/worker/status" }),
    z.void(),
    z.object({
      isConnected: z.boolean(),
      isDead: z.boolean(),
      id: z.string().optional(),
      pid: z.number().optional(),
      exitCode: z.number().nullable(),
      demon: z.object({
        pid: z.number(),
      }),
    }),
    () => ({
      isConnected: anchorDemon.worker.isConnected(),
      isDead: anchorDemon.worker.isDead(),
      id: getWorkerId(anchorDemon.worker),
      pid: anchorDemon.worker.process.pid,
      exitCode: anchorDemon.worker.process.exitCode,
      demon: {
        pid: process.pid,
      },
    }),
  );
