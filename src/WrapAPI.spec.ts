import { URLPattern } from "urlpattern-polyfill";
import { WrapAPI } from "./WrapAPI";
import test from "node:test";
import * as assert from "node:assert/strict";
import { readJsonBody, Sandbox } from "./utils_tests/sandbox";

test("WrapAPI", async (test) => {
  const sandbox = new Sandbox();

  await test.before(async () => {
    await sandbox.init({
      signal: test.signal,
      handlerMapInit: new Map([
        [new URLPattern({ pathname: "/api1" }), async (req, res) => {
          const payload = await readJsonBody(req);
          res.setHeader("Content-Type", "application/json");
          res.write(JSON.stringify({ payload }));
          res.end();
        }],
        [new URLPattern({ pathname: "/api_error" }), async (req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.write(JSON.stringify({ error: { message: "invalid" } }));
          res.end();
        }],
      ]),
    });
  });

  await test.after(() => {
    sandbox.close();
  });

  await test.test("should call to fetch", async () => {
    const api = new WrapAPI({ baseUrl: sandbox.server.baseUrl });
    const res = await api.fetch("/api1", {
      requestInit: { method: "POST" },
      json: { ok: true, a: "b" },
    });
  });

  await test.test("should call to simple api", async () => {
    const api = new WrapAPI({
      baseUrl: new URL("/api1", sandbox.server.baseUrl),
    });
    const res = await api.sapi("reactiveJob", {
      "workflowId": "01H5H4HY91C7S9JRRN70SYN7HS",
      "jobId": "01H5H4J063Q9HBK4A2GRW0GX6R",
    });
    assert.equal(typeof res, "object");
    assert.equal(typeof res.payload, "object");
  });

  // await test.test("should call to simple api", async () => {
  //   const api = new WrapAPI({ baseUrl: sandbox.server.baseUrl });
  //   const res = await api.sapi("/api_error", "reactiveJob", {
  //     "workflowId": "01H5H4HY91C7S9JRRN70SYN7HS",
  //     "jobId": "01H5H4J063Q9HBK4A2GRW0GX6R",
  //   });
  //   assert.equal(typeof res, "object");
  //   assert.equal(typeof res.payload, "object");
  // });
});
