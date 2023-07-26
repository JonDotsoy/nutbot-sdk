import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

export const nutbotAnchorPath = new URL(
  `.nutbot-anchor/`,
  pathToFileURL(`${homedir()}/`),
);

export const logsPath = new URL(
  `logs/`,
  nutbotAnchorPath,
);

export const demonPIDPath = new URL("demon.pid", nutbotAnchorPath);
export const demonIDPath = new URL("demon.id", nutbotAnchorPath);
export const workerLogPath = (workerId: string) => new URL(`${workerId}.log`, logsPath);
export const workerErrorLogPath = (workerId: string) => new URL(`${workerId}.error_log`, logsPath);
