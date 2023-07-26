export const setFlagDescription = <T extends (...args: any) => any>(
  label: string,
  handler: T,
): T => {
  Reflect.set(handler, Symbol.for("flag.description.label"), label);
  return handler;
};

export const getFlagDescription = (handler: Function) => {
  return {
    label: Reflect.get(handler, Symbol.for("flag.description.label")) as
      | string
      | undefined,
  };
};

export const ShowHelp = (
  cliName: string,
  flagsHandlers: FlagsHandlers<any>,
) => {
  const lines: string[] = [];

  const flags = Object.entries(flagsHandlers).map(([flagName, handler]) => {
    const e = getFlagDescription(handler).label;
    const labelValue = e ? ` ${e}` : ``;
    return `[${flagName}${labelValue}]`;
  });

  lines.push(`Usage: ${cliName} ${flags.join(" ")}`);

  return lines.join("\n");
};

type FlagsHandlers<T> = Record<
  string,
  (
    options: T,
    nextFlagValue: () => string | undefined,
    e: FlagsHandlers<T>,
  ) => void
>;

export const makeFlags = <T>(
  init: T,
  args: string[],
  flagsHandlers: FlagsHandlers<T>,
  rejectUnknownArgument = true,
): T => {
  const argsIterator = args[Symbol.iterator]();

  for (const arg of argsIterator) {
    const flagHandler = flagsHandlers[arg];
    if (rejectUnknownArgument && !flagHandler) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    flagHandler?.call(
      flagsHandlers,
      init,
      () => argsIterator.next().value,
      flagsHandlers,
    );
  }

  return init;
};
