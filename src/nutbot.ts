import { NutbotSDK } from "./NutbotSDK";

const NUTBOT_DSN = process.env.NUTBOT_DSN;

export const nutbot = new NutbotSDK({ dsn: NUTBOT_DSN });
