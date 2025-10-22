import { Dual } from "./dual-cat";
import {
  constructContravariantFunctorWithWitness,
  type ContravariantFunctorWithWitness,
} from "./contravariant";
import {
  constructFunctorWithWitness,
  identityFunctorWithWitness,
  type FunctorCheckSamples,
  type FunctorWithWitness,
} from "./functor";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import { EnhancedVect } from "./stdlib/enhanced-vect";
import { enhancedVectSimpleCategory } from "./enhanced-vect-simple-category";

export interface FiniteDimensionalDualToolkit {
  readonly contravariant: ContravariantFunctorWithWitness<
    EnhancedVect.VectObj,
    EnhancedVect.VectMor,
    EnhancedVect.VectObj,
    EnhancedVect.VectMor
  >;
  readonly opposite: FunctorWithWitness<
    EnhancedVect.VectObj,
    EnhancedVect.VectMor,
    EnhancedVect.VectObj,
    EnhancedVect.VectMor
  >;
  readonly doubleDual: FunctorWithWitness<
    EnhancedVect.VectObj,
    EnhancedVect.VectMor,
    EnhancedVect.VectObj,
    EnhancedVect.VectMor
  >;
  readonly evaluation: NaturalTransformationWithWitness<
    EnhancedVect.VectObj,
    EnhancedVect.VectMor,
    EnhancedVect.VectObj,
    EnhancedVect.VectMor
  >;
  readonly coevaluation: NaturalTransformationWithWitness<
    EnhancedVect.VectObj,
    EnhancedVect.VectMor,
    EnhancedVect.VectObj,
    EnhancedVect.VectMor
  >;
  readonly objectOf: (object: EnhancedVect.VectObj) => EnhancedVect.VectObj;
  readonly transposeOf: (arrow: EnhancedVect.VectMor) => EnhancedVect.VectMor;
}

type VectObj = EnhancedVect.VectObj;
type VectMor = EnhancedVect.VectMor;

type Matrix = ReadonlyArray<ReadonlyArray<number>>;

const dualForward = new WeakMap<VectObj, VectObj>();
const dualReverse = new WeakMap<VectObj, VectObj>();

const cloneVectorSpace = (dimension: number): VectObj => ({ dim: dimension });

const dualObjectOf = (object: VectObj): VectObj => {
  const reversed = dualReverse.get(object);
  if (reversed) {
    return reversed;
  }
  const existing = dualForward.get(object);
  if (existing) {
    return existing;
  }
  const dual = cloneVectorSpace(object.dim);
  dualForward.set(object, dual);
  dualReverse.set(dual, object);
  return dual;
};

const transposeMatrix = (matrix: Matrix): Matrix => {
  const rowCount = matrix.length;
  const columnCount = rowCount === 0 ? 0 : matrix[0]!.length;
  const transposed: number[][] = Array.from({ length: columnCount }, () =>
    Array(rowCount).fill(0),
  );
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = matrix[rowIndex]!;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const value = row[columnIndex] ?? 0;
      transposed[columnIndex]![rowIndex] = value;
    }
  }
  return transposed.map((row) => row.slice()) as Matrix;
};

const transposeArrow = (arrow: VectMor): VectMor => ({
  matrix: transposeMatrix(arrow.matrix),
  from: dualObjectOf(arrow.to),
  to: dualObjectOf(arrow.from),
});

const doubleTransposeArrow = (arrow: VectMor): VectMor =>
  transposeArrow(transposeArrow(arrow));

const sampleObjects: ReadonlyArray<VectObj> = [
  cloneVectorSpace(0),
  cloneVectorSpace(1),
  cloneVectorSpace(2),
];

const objectByDimension = (dimension: number): VectObj => {
  const found = sampleObjects.find((candidate) => candidate.dim === dimension);
  return found ?? cloneVectorSpace(dimension);
};

const idOne = EnhancedVect.Vect.id(objectByDimension(1));
const idTwo = EnhancedVect.Vect.id(objectByDimension(2));

const inclusion: VectMor = {
  matrix: [[1], [0]],
  from: objectByDimension(1),
  to: objectByDimension(2),
};

const projection: VectMor = {
  matrix: [[1, 0]],
  from: objectByDimension(2),
  to: objectByDimension(1),
};

const endomorphism: VectMor = {
  matrix: [
    [2, 3],
    [5, 7],
  ],
  from: objectByDimension(2),
  to: objectByDimension(2),
};

const samples: FunctorCheckSamples<VectObj, VectMor> = {
  objects: sampleObjects,
  arrows: [idOne, idTwo, inclusion, projection, endomorphism],
  composablePairs: [
    { f: inclusion, g: endomorphism },
    { f: endomorphism, g: projection },
  ],
};

const metadata = {
  contravariant: [
    "Finite-dimensional dual transposes matrices and reverses arrows in EnhancedVect.",
  ],
  opposite: [
    "View the dual as a covariant functor on the opposite category via Dual(Vect).",
  ],
  doubleDual: [
    "Double dual identifies each space with its canonical bidual representative.",
  ],
  evaluation: [
    "Evaluation exhibits the natural inclusion of a space into its double dual.",
  ],
  coevaluation: [
    "Coevaluation witnesses the inverse natural transformation from the double dual.",
  ],
} as const;

const buildIdentityFunctor = () =>
  identityFunctorWithWitness(enhancedVectSimpleCategory, samples);

export const finiteDimensionalDualFunctorWithWitness = (): FiniteDimensionalDualToolkit => {
  const contravariant = constructContravariantFunctorWithWitness(
    enhancedVectSimpleCategory,
    enhancedVectSimpleCategory,
    {
      F0: dualObjectOf,
      F1: transposeArrow,
    },
    samples,
    metadata.contravariant,
  );

  const oppositeSamples: FunctorCheckSamples<VectObj, VectMor> = {
    ...(samples.objects ? { objects: samples.objects } : {}),
    ...(samples.arrows ? { arrows: samples.arrows } : {}),
    ...(samples.composablePairs
      ? {
          composablePairs: samples.composablePairs.map((pair) => ({
            f: pair.g,
            g: pair.f,
          })),
        }
      : {}),
  };

  const opposite = constructFunctorWithWitness(
    Dual(enhancedVectSimpleCategory),
    enhancedVectSimpleCategory,
    contravariant.functor,
    oppositeSamples,
    metadata.opposite,
  );

  const doubleDual = constructFunctorWithWitness(
    enhancedVectSimpleCategory,
    enhancedVectSimpleCategory,
    {
      F0: (object) => dualObjectOf(dualObjectOf(object)),
      F1: doubleTransposeArrow,
    },
    samples,
    metadata.doubleDual,
  );

  const identity = buildIdentityFunctor();

  const evaluation = constructNaturalTransformationWithWitness(
    identity,
    doubleDual,
    (object) => EnhancedVect.Vect.id(identity.functor.F0(object)),
    {
      samples: {
        ...(samples.objects ? { objects: samples.objects } : {}),
        ...(samples.arrows ? { arrows: samples.arrows } : {}),
      },
      metadata: metadata.evaluation,
    },
  );

  const coevaluation = constructNaturalTransformationWithWitness(
    doubleDual,
    identity,
    (object) => EnhancedVect.Vect.id(identity.functor.F0(object)),
    {
      samples: {
        ...(samples.objects ? { objects: samples.objects } : {}),
        ...(samples.arrows ? { arrows: samples.arrows } : {}),
      },
      metadata: metadata.coevaluation,
    },
  );

  return {
    contravariant,
    opposite,
    doubleDual,
    evaluation,
    coevaluation,
    objectOf: dualObjectOf,
    transposeOf: transposeArrow,
  };
};

export const dualSimpleCategory = Dual(enhancedVectSimpleCategory);
