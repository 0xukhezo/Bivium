import { COMMON_TYPES } from "@bivium/common";
import type { ILogger } from "@bivium/common/logger";
import { inject, injectable } from "inversify";

/**
 * Base class for all use cases. Already decorated with @injectable() so children
 * skip that boilerplate. The logger is property-injected here so handlers don't
 * have to re-declare it in every constructor — children just need:
 *
 *   @injectable()
 *   @injectFromBase()           // inherit the property injection from this base
 *   export class MyHandler extends BaseUseCase<In, Out> {
 *     constructor(@inject(...) private dep: Dep) { super(); }
 *   }
 *
 * Without `@injectFromBase()` on the child, Inversify v7 does NOT apply the
 * parent's @inject decorators and `this.logger` is undefined at runtime — a
 * silent failure. Always pair @injectable + @injectFromBase + super() in children.
 */
@injectable()
export abstract class BaseUseCase<TInput, TOutput> {
	@inject(COMMON_TYPES.Logger)
	protected logger!: ILogger;

	abstract execute(input: TInput): Promise<TOutput>;
}
