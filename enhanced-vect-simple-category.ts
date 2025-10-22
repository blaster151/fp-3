import { EnhancedVect } from "./stdlib/enhanced-vect";
import type { SimpleCat } from "./simple-cat";

export const enhancedVectSimpleCategory: SimpleCat<
  EnhancedVect.VectObj,
  EnhancedVect.VectMor
> & {
  readonly eq: (
    left: EnhancedVect.VectMor,
    right: EnhancedVect.VectMor,
  ) => boolean;
} = {
  id: EnhancedVect.Vect.id,
  compose: EnhancedVect.Vect.compose,
  src: EnhancedVect.Vect.dom,
  dst: EnhancedVect.Vect.cod,
  eq: (left, right) => EnhancedVect.Vect.equalMor!(left, right),
};
