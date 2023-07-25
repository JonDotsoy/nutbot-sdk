import contentType from "content-type";
import { inspect } from "node:util";

export interface WrapAPIOptions {
  baseUrl: URL;
}

export interface WrapAPIFetchOptions {
  requestInit?: RequestInit;
  statusCodeExpected?: number;
  json?: any;
}

export class WrapAPI {
  baseUrl: URL;

  constructor(options: WrapAPIOptions) {
    this.baseUrl = options.baseUrl;
  }

  async fetch(relativeUrl: string | URL, options?: WrapAPIFetchOptions) {
    const url = new URL(relativeUrl, this.baseUrl);

    const res = await fetch(url, {
      ...options?.requestInit ?? {},
      headers: new Headers([
        [`Content-Type`, `application/json`],
      ]),
      body: !options?.json ? undefined : JSON.stringify(options.json),
    });

    const contentTypeHeader = contentType.parse(
      res.headers.get(`Content-Type`) ?? "plain/text",
    );

    const toObject = async () => {
      const resBody = await res.arrayBuffer();
      if (contentTypeHeader.type.toLowerCase() === "application/json") {
        return JSON.parse(new TextDecoder().decode(new Uint8Array(resBody)));
      }
      throw new Error(`Invalid content type ${contentTypeHeader.type}`);
    };

    const body = await toObject();
    const statusCodeExpected = options?.statusCodeExpected ?? 200;

    // const body = res.headers.get('Content-Type') === "application/json" ?

    if (res.status !== statusCodeExpected) {
      throw new Error(
        `Invalid status code received ${res.status} body: ${inspect(body)}`,
      );
    }

    return body;
  }

  async sapi(
    methodName: string,
    payload: any,
  ): Promise<any> {
    const res = await this.fetch(this.baseUrl, {
      requestInit: { method: "POST" },
      json: { [methodName]: payload },
    });

    return res;
  }
}
