import { Worker } from "node:cluster";
export const WorkerId = Symbol("worker.id");

export const getWorkerId = (obj: Worker) => Reflect.get(obj, WorkerId);
export const setWorkerId = (obj: Worker, id: string) =>
  Reflect.set(obj, WorkerId, id);
