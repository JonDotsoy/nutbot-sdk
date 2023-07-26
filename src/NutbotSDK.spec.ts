import { describe, it } from "node:test";
import { onceByKey, PayloadLog, PayloadLogSync } from "./NutbotSDK";
import { ulid } from "ulid";
import assets from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

describe("Logs Subs", () => {
  it("subscribe", async () => {
    const calls: PayloadLog[][] = [];

    const payloadLogSync = new PayloadLogSync(50, async (items) => {
      calls.push(items);
      await setTimeout(200);
    });

    payloadLogSync.push({ kind: "LOG", uid: ulid(), message: "a" });

    await setTimeout(100);

    assets.equal(calls.length, 1);
    assets.equal(calls.at(0)?.length, 1);
    assets.equal(calls.at(0)?.at(0)?.message, "a");
  });

  it("subscribe", async () => {
    const calls: PayloadLog[][] = [];

    const payloadLogSync = new PayloadLogSync(50, async (items) => {
      console.log(`called`, items);
      calls.push([...items]);
      await setTimeout(200);
    });

    payloadLogSync.push({ kind: "LOG", uid: ulid(), message: "a" });
    payloadLogSync.push({ kind: "LOG", uid: ulid(), message: "b" });
    payloadLogSync.push({ kind: "LOG", uid: ulid(), message: "c" });

    assets.equal(calls.length, 1);
    assets.equal(calls.at(0)?.length, 1);
    assets.equal(calls.at(0)?.at(0)?.message, "a");
    await setTimeout(300);
    assets.equal(calls.length, 2);
    assets.equal(calls.at(0)?.length, 1);
    assets.equal(calls.at(1)?.length, 2);
    assets.equal(calls.at(1)?.at(0)?.message, "b");
    assets.equal(calls.at(1)?.at(1)?.message, "c");
    payloadLogSync.push({ kind: "LOG", uid: ulid(), message: "d" });
    await setTimeout(300);
    assets.equal(calls.length, 3);
    assets.equal(calls.at(2)?.at(0)?.message, "d");
  });
});

describe("onceLogError", () => {
  it("many calls", () => {
    const calls: any[] = [];
    for (const e of Array(3).fill(null)) {
      onceByKey(new Error("asd"), (ex) => calls.push(ex));
    }
    console.log(calls);
  });
});
