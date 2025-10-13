import type { CatMonad as _CatMonad } from '../allTS';

declare global {
  type CatMonad<C> = _CatMonad<C>;
}

export {};
