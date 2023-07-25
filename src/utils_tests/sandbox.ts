import { IncomingMessage, RequestListener, Server } from "node:http";
import { URLPattern } from "urlpattern-polyfill";
import { inspect } from "node:util";

export class Sandbox {
  server!: SandboxServer;

  async init(
    { signal, handlerMapInit }: {
      signal: AbortSignal;
      handlerMapInit?: Map<URLPattern, RequestListener>;
    },
  ) {
    this.server = await new SandboxServer(handlerMapInit).init({ signal });

    return this;
  }

  close() {
    this.server.close();
  }
}

export const readJsonBody = async (req: IncomingMessage) => {
  const body = await readBody(req);

  if (body) return JSON.parse(new TextDecoder().decode(body));

  return {};
};

export const readBody = async (req: IncomingMessage) => {
  if (req.readable) {
    return await new Promise<Uint8Array>((resolve, reject) => {
      req.once("readable", () => {
        let buff: Uint8Array = new Uint8Array();
        let chunk: Uint8Array;
        while (chunk = req.read()) {
          buff = new Uint8Array([...buff, ...chunk]);
        }

        resolve(buff);
      });
    });
  }
};

export class SandboxServer {
  server: Server;
  port!: number;
  baseUrl!: URL;

  constructor(private handlerMapInit?: Map<URLPattern, RequestListener>) {
    this.server = new Server(this.handler);
  }

  close() {
    this.server.close();
  }

  handler: RequestListener = async (req, res) => {
    const url = new URL(req.url!, this.baseUrl);
    try {
      for (const [urlPattern, handler] of this.handlerMap) {
        if (urlPattern.test(url)) {
          return await handler(req, res);
        }
      }

      res.statusCode = 404;
      res.setHeader(`Content-Type`, `application/json`);
      res.write(JSON.stringify({}));
      return res.end();
    } catch (ex) {
      res.statusCode = 500;
      res.setHeader(`Content-Type`, `application/json;car=dex`);
      res.write(JSON.stringify({ error: { stack: inspect(ex) } }));
      return res.end();
    }
  };

  handlerMap = this.handlerMapInit ?? new Map<URLPattern, RequestListener>();

  async init({ signal }: { signal: AbortSignal }) {
    signal.addEventListener("abort", () => {
      this.server.close();
    });

    await new Promise((resolve, reject) => {
      this.server.listen(() => {
        const address = this.server.address();
        if (!(typeof address === "object" && address !== null)) {
          return reject(new Error(`Invalid address to setup server`));
        }

        this.port = address.port;
        this.baseUrl = new URL(`http://localhost:${this.port}`);

        return resolve(this);
      });
    });
    return this;
  }
}
