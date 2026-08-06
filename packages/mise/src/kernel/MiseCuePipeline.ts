export type MiseCue<TContext> = (
  context: TContext,
) => Promise<void> | void;

export interface MiseCuePipelineOptions<TContext> {
  readonly before?: readonly MiseCue<TContext>[];
  readonly after?: readonly MiseCue<TContext>[];
}

export class MiseCuePipeline<TContext> {
  private readonly beforeCues: readonly MiseCue<TContext>[];
  private readonly afterCues: readonly MiseCue<TContext>[];

  constructor(options: MiseCuePipelineOptions<TContext> = {}) {
    this.beforeCues = Object.freeze([...(options.before ?? [])]);
    this.afterCues = Object.freeze([...(options.after ?? [])]);
  }

  async before(context: TContext): Promise<void> {
    await runCues(this.beforeCues, context);
  }

  async after(context: TContext): Promise<void> {
    await runCues(this.afterCues, context);
  }

  async run<TResult>(
    context: TContext,
    action: () => Promise<TResult> | TResult,
  ): Promise<TResult> {
    await this.before(context);
    const result = await action();
    await this.after(context);
    return result;
  }
}

async function runCues<TContext>(
  cues: readonly MiseCue<TContext>[],
  context: TContext,
): Promise<void> {
  for (const cue of cues) await cue(context);
}
