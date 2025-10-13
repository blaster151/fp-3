import type { EndofunctorValue as _EndofunctorValue } from '../allTS';

declare global {
  // Allow tests to refer to EndofunctorValue without importing the module explicitly.
  type EndofunctorValue<F, A> = _EndofunctorValue<F, A>;
}

export {};
