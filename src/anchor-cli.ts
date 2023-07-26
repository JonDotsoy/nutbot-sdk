#!/usr/bin/env node

import { makeFlags } from "./utils/make-flags";

const main = async () => {
  const options = makeFlags<Partial<{}>>({}, process.argv.slice(2), {});
  console.log(process.argv);
};

main().catch(console.error);
