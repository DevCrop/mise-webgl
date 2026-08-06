export interface MiseComponentContract {
  readonly element: string;
  readonly focus: string;
  readonly id: `mise.${string}.${string}.v${number}`;
  readonly keyboard: readonly string[];
  readonly noJs: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly slots: Readonly<Record<string, unknown>>;
  readonly states: readonly string[];
}

export function defineComponentContract<const Contract extends MiseComponentContract>(
  contract: Contract,
): Contract {
  return Object.freeze(contract);
}
