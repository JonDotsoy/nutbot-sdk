import { z } from "zod";
import { AnchorDemon } from "../../../anchor.demon";

export default (anchorDemon: AnchorDemon) =>
  anchorDemon.api(
    "worker_restart",
    new URLPattern({ pathname: "/worker/restart" }),
    z.void(),
    z.void(),
    async () => {
      anchorDemon.worker.kill();
      anchorDemon.worker = anchorDemon.getWorker();
    },
  );
