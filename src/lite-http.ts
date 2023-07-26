import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { URLPattern } from "urlpattern-polyfill";
import { z, ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as YAML from "yaml";
import mimeTypes from "mime-types";

export type RequestListener = (
  req: LiteRequest,
) => any;

export class LiteRequest {
  constructor(
    private req: IncomingMessage,
    private res: ServerResponse,
  ) {}

  accept(types: string[]) {
    const reqHeaderContentType = this.req.headers["accept"];

    if (!reqHeaderContentType) return true;

    return types.map((t) => mimeTypes.lookup(t)).some((contentType) => {
      return contentType && reqHeaderContentType &&
        mimeTypes.extension(contentType) ===
          mimeTypes.extension(reqHeaderContentType);
    });
  }

  contentType(types: string[]) {
    const reqHeaderContentType = this.req.headers["content-type"];

    if (!reqHeaderContentType) return true;

    return types.map((t) => mimeTypes.lookup(t)).some((contentType) => {
      return contentType && reqHeaderContentType &&
        mimeTypes.extension(contentType) ===
          mimeTypes.extension(reqHeaderContentType);
    });
  }

  async object() {
    let payload = new Uint8Array([]);

    await new Promise((resolve, reject) => {
      this.req.on(
        "data",
        (data: Uint8Array) => {
          payload = new Uint8Array([...payload, ...new Uint8Array(data)]);
        },
      );

      this.req.once("error", reject);
      this.req.once("end", resolve);
    });

    if (!payload.length) return;

    return this.contentType(["yaml", "yml"])
      ? YAML.parse(new TextDecoder().decode(payload))
      : JSON.parse(new TextDecoder().decode(payload));
  }
}

export class LiteResponse {
  status: number = 200;
  payload?: string;
  headers = new Map<string, string>();

  setPayload(payload: string) {
    this.payload = payload;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }

  appendToHeader(name: string, value: string) {
    this.headers.set(name, `${this.headers.get(name) ?? ""}${value}`);
    return this;
  }
}

export const json = (payload: any) =>
  new LiteResponse().setHeader("Content-Type", "application/json")
    .setPayload(JSON.stringify(payload, null, 2));

export const yaml = (payload: any) =>
  new LiteResponse().setHeader("Content-Type", "application/x-yaml")
    .setPayload(YAML.stringify(payload));

export class LiteHTTP {
  private router = new Map<
    [method: string, pattern: string | URLPattern],
    RequestListener
  >();

  constructor(private port: number = 8787, private host: string = "0.0.0.0") {}

  use(method: string, pattern: string | URLPattern, handler: RequestListener) {
    this.router.set([method, pattern], handler);
  }

  api<I extends z.ZodSchema, O extends z.ZodSchema>(
    name: string,
    pattern: URLPattern,
    input: I,
    output: O,
    handler: (input: z.infer<I>) => Promise<z.infer<O>> | z.infer<O>,
  ) {
    const pathnameSchemaLocation = `/schemas/${name}.schema.json`;

    this.use(
      "GET",
      new URLPattern({ pathname: pathnameSchemaLocation }),
      () => json(zodToJsonSchema(z.object({ input, output }))),
    );

    this.use(
      "POST",
      pattern,
      async (req) => {
        const payload = await handler(input.parse(await req.object()));

        const res = req.accept(["yaml", "yml"]) ? yaml(payload) : json(payload);

        return res
          .appendToHeader(
            "Content-Type",
            `; profile=${
              JSON.stringify(
                `${new URL(pathnameSchemaLocation, this.toURL())}`,
              )
            }`,
          );
      },
    );
  }

  private handler = async (
    req: IncomingMessage,
    res: ServerResponse,
  ) => {
    try {
      const url = new URL(req.url ?? "/", new URL("http://localhost"));
      for (const [[method, patternRaw], handler] of this.router) {
        const pattern = new URLPattern(patternRaw);
        if (req.method === method && pattern.test(url)) {
          const result = await handler(new LiteRequest(req, res));
          if (result instanceof LiteResponse) {
            res.statusCode = result.status;
            for (const [headerName, headerValue] of result.headers) {
              res.setHeader(headerName, headerValue);
            }
            if (result.payload !== undefined) {
              res.write(result.payload);
            }
            res.end();
          }
          return;
        }
      }
      res.statusCode = 404;
      res.end();
    } catch (ex) {
      console.error(ex);
      res.statusCode = 500;
      res.end();
    }
  };

  private server = createServer(this.handler);

  toURL() {
    const address = this.server.address();

    if (!address) throw new Error(`Server is not ready yet`);
    if (typeof address === "string") return new URL(address);
    return new URL(`http://localhost:${address.port}`);
  }

  async listen() {
    await new Promise<Server>((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        resolve(this.server);
      });
      this.server.once("error", reject);
    });
  }
}
