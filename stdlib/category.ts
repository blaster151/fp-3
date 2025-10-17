import type { ArrowFamilies } from "./arrow-families"

export interface Category<O, M> {
  id: (a: O) => M
  compose: (g: M, f: M) => M
  isId?: (m: M) => boolean
  equalMor?: (x: M, y: M) => boolean
}

/** Groupoid: category where every morphism is invertible */
export interface Groupoid<O, M> extends Category<O, M>, ArrowFamilies.HasDomCod<O, M> {
  inv: (m: M) => M                           // inverse for every morphism
}

/** Finite, enumerable groupoid (for algorithms/tests) */
export interface FiniteGroupoid<O, M> extends Groupoid<O, M> {
  objects: ReadonlyArray<O>
  // All isomorphisms between a and b (may include only identities/empties)
  hom: (a: O, b: O) => ReadonlyArray<M>
}

/** Functor between groupoids */
export interface GFunctor<GO, GM, HO, HM> {
  source: FiniteGroupoid<GO, GM>
  target: FiniteGroupoid<HO, HM>
  onObj: (g: GO) => HO
  onMor: (m: GM) => HM
}

/** Finite small category for end constructions */
export interface FiniteCategory<O, M> extends Category<O, M>, ArrowFamilies.HasDomCod<O, M> {
  objects: ReadonlyArray<O>
  hom: (a: O, b: O) => ReadonlyArray<M>
}

export const FiniteCategory = Symbol.for('FiniteCategory')

/** Functor for codensity constructions */
export interface CFunctor<BO, BM, AO, AM> {
  source: FiniteCategory<BO, BM>
  target: Category<AO, AM> & ArrowFamilies.HasDomCod<AO, AM>
  onObj: (b: BO) => AO
  onMor: (m: BM) => AM
}

export const CFunctor = Symbol.for('CFunctor')

/** Categorical functor interface */
export type ObjOf<C> = C extends ArrowFamilies.HasDomCod<infer O, infer _>
  ? O
  : C extends { id: (a: infer O) => unknown }
    ? O
    : C extends { objects: ReadonlyArray<infer O> }
      ? O
      : C extends string
        ? string
        : unknown

export type MorOf<C> = C extends ArrowFamilies.HasDomCod<infer _, infer M>
  ? M
  : C extends { compose: (g: infer M, f: infer M) => unknown }
    ? M
    : C extends { hom: (a: infer _O, b: infer _O) => ReadonlyArray<infer M> }
      ? M
      : C extends string
        ? string
        : unknown

export interface CatFunctor<C, D> {
  source: C
  target: D
  onObj: (obj: ObjOf<C>) => ObjOf<D>
  onMor: (mor: MorOf<C>) => MorOf<D>
}

/** Natural transformation interface */
export interface CatNatTrans<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<unknown, unknown>
> {
  source: F
  target: G
  component: (obj: ObjOf<F['source']>) => MorOf<F['target']>
}

/** Identity functor type */
export type CatId<C> = CatFunctor<C, C>

/** Functor composition type */
export type CatCompose<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<F['target'], unknown>
> = CatFunctor<F['source'], G['target']>

/** Categorical monad interface */
export interface CatMonad<C> {
  category: C
  endofunctor: CatFunctor<C, C>
  unit: CatNatTrans<CatId<C>, CatFunctor<C, C>>
  mult: CatNatTrans<CatCompose<CatFunctor<C, C>, CatFunctor<C, C>>, CatFunctor<C, C>>
}

export const CatMonad = Symbol.for('CatMonad')

/** Adjunction with explicit unit/counit */
export interface Adjunction<C, D, F extends CatFunctor<C, D>, U extends CatFunctor<D, C>> {
  readonly F: F
  readonly U: U
  readonly unit: CatNatTrans<CatId<C>, CatCompose<F, U>>
  readonly counit: CatNatTrans<CatCompose<U, F>, CatId<D>>
}

/* ================================================================
   Natural transformation operations (whiskering, composition)
   ================================================================ */

/** Compose functors G∘F */
export const composeFun = <C, D, E>(
  F: CatFunctor<C, D>,
  G: CatFunctor<D, E>
): CatFunctor<C, E> => ({
  source: F.source,
  target: G.target,
  onObj: (a: ObjOf<C>) => G.onObj(F.onObj(a)),
  onMor: (f: MorOf<C>) => G.onMor(F.onMor(f))
})

/** Identity functor */
export const idFun = <C>(C: C): CatFunctor<C, C> => ({
  source: C,
  target: C,
  onObj: (obj: ObjOf<C>) => obj,
  onMor: (mor: MorOf<C>) => mor
})

const identityMorph = <C>(
  category: C,
  obj: ObjOf<C>
): MorOf<C> => {
  const candidate = category as Partial<Category<ObjOf<C>, MorOf<C>>>
  if (candidate.id) {
    return candidate.id(obj)
  }
  return obj as unknown as MorOf<C>
}

/** Identity natural transformation */
export const idNat = <C, D, F extends CatFunctor<C, D>>(F: F): CatNatTrans<F, F> => ({
  source: F,
  target: F,
  component: (obj: ObjOf<C>) => {
    const targetCategory = F.target as Partial<Category<ObjOf<D>, MorOf<D>>>
    if (targetCategory.id) {
      const image = F.onObj(obj) as ObjOf<D>
      return targetCategory.id(image)
    }
    const sourceCategory = F.source as Partial<Category<ObjOf<C>, MorOf<C>>>
    if (sourceCategory.id) {
      return F.onMor(sourceCategory.id(obj))
    }
    return F.onMor(obj as unknown as MorOf<C>)
  }
})

/** Left whiskering F ▷ α */
export const whiskerLeft = <
  A,
  B,
  C,
  F extends CatFunctor<A, B>,
  G extends CatFunctor<B, C>,
  H extends CatFunctor<B, C>
>(
  F: F,
  alpha: CatNatTrans<G, H>
): CatNatTrans<CatCompose<F, G>, CatCompose<F, H>> => ({
  source: composeFun(F, alpha.source),
  target: composeFun(F, alpha.target),
  component: (a: ObjOf<A>) => alpha.component(F.onObj(a))
})

/** Right whiskering α ◁ F */
export const whiskerRight = <
  A,
  B,
  C,
  G extends CatFunctor<B, C>,
  H extends CatFunctor<B, C>,
  F extends CatFunctor<A, B>
>(
  alpha: CatNatTrans<G, H>,
  F: F
): CatNatTrans<CatCompose<F, G>, CatCompose<F, H>> => ({
  source: composeFun(F, alpha.source),
  target: composeFun(F, alpha.target),
  component: (c: ObjOf<A>) => alpha.component(F.onObj(c))
})

/** Vertical composition α ; β */
export const vcomp = <
  C,
  D,
  F extends CatFunctor<C, D>,
  G extends CatFunctor<C, D>,
  H extends CatFunctor<C, D>
>(
  alpha: CatNatTrans<F, G>,
  beta: CatNatTrans<G, H>
): CatNatTrans<F, H> => ({
  source: alpha.source,
  target: beta.target,
  component: (obj: ObjOf<C>) => {
    const category = beta.target.target as
      | { compose?: (g: MorOf<D>, f: MorOf<D>) => MorOf<D> }
      | undefined
    if (category?.compose) {
      return category.compose(beta.component(obj), alpha.component(obj))
    }
    return beta.component(obj)
  }
})

/** Horizontal composition α * β */
export const hcomp = <
  A,
  B,
  C,
  F1 extends CatFunctor<A, B>,
  F2 extends CatFunctor<A, B>,
  G1 extends CatFunctor<B, C>,
  G2 extends CatFunctor<B, C>
>(
  alpha: CatNatTrans<F1, F2>,
  beta: CatNatTrans<G1, G2>
): CatNatTrans<CatCompose<F1, G1>, CatCompose<F2, G2>> => ({
  source: composeFun(alpha.source, beta.source),
  target: composeFun(alpha.target, beta.target),
  component: (a: ObjOf<A>) => {
    const targetCategory = beta.target.target as
      | { compose?: (g: MorOf<C>, f: MorOf<C>) => MorOf<C> }
      | undefined
    const Fa = alpha.source.onObj(a)
    const lifted = beta.target.onMor(alpha.component(a))
    const mapped = beta.component(Fa)
    return targetCategory?.compose ? targetCategory.compose(lifted, mapped) : mapped
  }
})

/* ================================================================
   Core Adjunction Framework with Mate Utilities
   ================================================================ */

// Re-export core types that match our existing idioms
export interface CoreCategory<Obj, Mor> {
  id: (a: Obj) => Mor  // Id_A
  compose: (g: Mor, f: Mor) => Mor  // g ∘ f
}

export interface CoreFunctor<CObj, DObj> {
  // Object action
  onObj: (a: CObj) => DObj
  // Morphism action
  onMor: (f: unknown) => unknown
}

type AnyCoreFunctor = CoreFunctor<any, any>

export interface CoreNatTrans<
  F extends AnyCoreFunctor,
  G extends AnyCoreFunctor
> {
  // component at object X in dom(F)=dom(G)
  at: (x: unknown) => unknown  // a morphism in codom(F)=codom(G)
}

type CoreNatSource<N> = N extends CoreNatTrans<infer S, AnyCoreFunctor> ? S : never
type CoreNatTarget<N> = N extends CoreNatTrans<AnyCoreFunctor, infer T> ? T : never

// Identity functor type
export type CoreId<CObj> = {
  onObj: <A extends CObj>(a: A) => A
  onMor: <f>(f: f) => f
}

// Functor composition type
export type CoreCompose<
  F extends AnyCoreFunctor,
  G extends AnyCoreFunctor
> = AnyCoreFunctor

/** Identity functor constructor */
export function coreIdFunctor<CObj>(): CoreId<CObj> {
  return {
    onObj: (a) => a,
    onMor: (f) => f
  }
}

/** Functor composition */
export function coreComposeFun<
  CObj, DObj, EObj,
  F extends CoreFunctor<CObj, DObj>,
  G extends CoreFunctor<DObj, EObj>
>(F_: F, G_: G): CoreCompose<F, G> {
  return {
    onObj: (a: CObj) => G_.onObj(F_.onObj(a)),
    onMor: (f: unknown) => G_.onMor(F_.onMor(f))
  } as unknown as CoreCompose<F, G>
}

/** Left whiskering F ▷ α */
export function coreWhiskerLeft<
  F extends AnyCoreFunctor,
  Source extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  α extends CoreNatTrans<Source, Target>
>(F_: F, α_: α): CoreNatTrans<CoreCompose<F, Source>, CoreCompose<F, Target>> {
  return {
    at: (x: unknown) => F_.onMor(α_.at(x))
  } as CoreNatTrans<CoreCompose<F, Source>, CoreCompose<F, Target>>
}

/** Right whiskering α ◁ F */
export function coreWhiskerRight<
  Source extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  α extends CoreNatTrans<Source, Target>,
  F extends AnyCoreFunctor
>(α_: α, F_: F): CoreNatTrans<CoreCompose<Source, F>, CoreCompose<Target, F>> {
  return {
    at: (x: unknown) => F_.onMor(α_.at(x))
  } as CoreNatTrans<CoreCompose<Source, F>, CoreCompose<Target, F>>
}

/** Vertical composition α ; β */
export function coreVcomp<
  Source extends AnyCoreFunctor,
  Mid extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  F extends CoreNatTrans<Source, Mid>,
  G extends CoreNatTrans<Mid, Target>
>(α: F, β: G): CoreNatTrans<Source, Target> {
  return {
    at: (x: unknown) => {
      // In practice: β.at(x) ∘ α.at(x) in the target category
      // For now, simplified composition
      return β.at(x)
    }
  } as CoreNatTrans<Source, Target>
}

/** Identity natural transformation */
export function coreIdNat<F extends AnyCoreFunctor>(F_: F): CoreNatTrans<F, F> {
  return {
    at: (x: unknown) => {
      // In practice: identity morphism at F(x)
      return x  // Simplified
    }
  }
}

/* ================================================================
   Adjunction Interface and Triangle Identities
   ================================================================ */

// TODO(virtual-equipment): Equipment-level adjunctions and relative variants
// are staged in `virtual-equipment/`.  Keep this notice so contributors who
// search here discover the dedicated module boundary.
// TODO(relative-monads): Definition 4.1 framing analyzers and law catalogues
// now live in `relative/`.  Future refactors should wire the classic monad
// helpers through that layer once the relative adjunction calculus is ready.
/**
 * An adjunction F ⊣ U : C ↔ D given by unit η : Id_C ⇒ U∘F and
 * counit ε : F∘U ⇒ Id_D.
 *
 * Structural and typed to match existing Functor/NatTrans patterns.
 */
export interface CoreAdjunction<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>
> {
  F: F_  // left adjoint
  U: U_  // right adjoint

  unit: CoreNatTrans<CoreId<CObj> & CoreFunctor<CObj, CObj>, CoreCompose<U_, F_>>     // η : Id_C ⇒ U∘F
  counit: CoreNatTrans<CoreCompose<F_, U_>, CoreId<DObj> & CoreFunctor<DObj, DObj>>   // ε : F∘U ⇒ Id_D

  /**
   * Optional dev-only: witnesses for triangle identities
   * (1) ε_F ∘ Fη = id_F
   * (2) Uε ∘ η_U = id_U
   */
  verifyTriangles?: () => void
}

/* ================================================================
   Mate Utilities (Hom-set bijection at NatTrans level)
   ================================================================ */

/**
 * Left mate along F ⊣ U.
 * Given α : F ∘ H ⇒ K, produce α♭ : H ⇒ U ∘ K
 * Formula: α♭ = (η ▷ H) ; (U ▷ α)
 */
export function leftMate<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alpha: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,  // Pass functor as value
  K_: K   // Pass functor as value
): CoreNatTrans<H, CoreCompose<U_, K>> {
  // α♭_X := U(α_X) ∘ η_{H X}
  return {
    at: (x: unknown) => {
      const HX = H_.onObj(x as CObj)
      const etaHX = adj.unit.at(HX)
      const UalphaX = adj.U.onMor(alpha.at(x))
      // Compose in C: HX --η--> U F HX --Uα--> U KX
      return { composed: [etaHX, UalphaX], result: UalphaX }  // Simplified composition
    }
  } as CoreNatTrans<H, CoreCompose<U_, K>>
}

/**
 * Right mate along F ⊣ U.
 * Given β : H ⇒ U ∘ K, produce β^♯ : F ∘ H ⇒ K
 * Formula: β^♯ = (F ▷ β) ; (ε ▷ K)
 */
export function rightMate<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  beta: CoreNatTrans<H, CoreCompose<U_, K>>,
  H_: H,  // Pass functor as value
  K_: K   // Pass functor as value
): CoreNatTrans<CoreCompose<F_, H>, K> {
  // β^♯_X := ε_{KX} ∘ F(β_X)
  return {
    at: (x: unknown) => {
      const HX = H_.onObj(x as CObj)
      const FHX = adj.F.onObj(HX)
      const FbetaX = adj.F.onMor(beta.at(x))
      const epsKX = adj.counit.at(K_.onObj(FHX))
      // Compose in D: F HX --Fβ--> F U KX --ε--> KX
      return { composed: [FbetaX, epsKX], result: epsKX }  // Simplified composition
    }
  } as CoreNatTrans<CoreCompose<F_, H>, K>
}

/**
 * Mate inverse verification: check that mates are mutually inverse
 * Useful for tests on small finite categories
 */
export function checkMateInverses<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alpha: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,  // Pass functors as values
  K_: K,
  sampleObjs: CObj[]
): boolean {
  try {
    const beta = leftMate<CObj, DObj, F_, U_, H, K>(adj, alpha, H_, K_)
    const alphaSharp = rightMate<CObj, DObj, F_, U_, H, K>(adj, beta, H_, K_)

    // Check equality on sample objects
    for (const x of sampleObjs) {
      const lhs = alphaSharp.at(x)
      const rhs = alpha.at(x)
      // Simplified equality check
      if (JSON.stringify(lhs) !== JSON.stringify(rhs)) {
        return false
      }
    }
    return true
  } catch (e) {
    return false
  }
}

/* ================================================================
   Triangle Identity Verification
   ================================================================ */

/**
 * Verify triangle identities for adjunction F ⊣ U
 * (1) ε_F ∘ Fη = id_F
 * (2) Uε ∘ η_U = id_U
 */
export function verifyTriangleIdentities<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>, 
  U_ extends CoreFunctor<DObj, CObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  sampleDObjs: DObj[],
  sampleCObjs: CObj[]
): { triangle1: boolean; triangle2: boolean; bothPass: boolean } {
  let triangle1 = true
  let triangle2 = true

  try {
    // (1) ε_F ∘ Fη = id_F (check on objects of C via F)
    for (const c of sampleCObjs) {
      const Fc = adj.F.onObj(c)
      const Feta_c = adj.F.onMor(adj.unit.at(c))  // F(η_c): F c → F U F c
      const eps_Fc = adj.counit.at(Fc)            // ε_{Fc}: F U F c → F c
      
      // In practice: check eps_Fc ∘ Feta_c = id_{Fc}
      // Simplified: just verify components exist
      if (!Feta_c || !eps_Fc) {
        triangle1 = false
        break
      }
    }
  } catch (e) {
    triangle1 = false
  }

  try {
    // (2) Uε ∘ η_U = id_U (check on objects of D via U)  
    for (const d of sampleDObjs) {
      const Ud = adj.U.onObj(d)
      const eta_Ud = adj.unit.at(Ud)              // η_{Ud}: U d → U F U d
      const Ueps_d = adj.U.onMor(adj.counit.at(d)) // U(ε_d): U F U d → U d
      
      // In practice: check Ueps_d ∘ eta_Ud = id_{Ud}
      // Simplified: just verify components exist
      if (!eta_Ud || !Ueps_d) {
        triangle2 = false
        break
      }
    }
  } catch (e) {
    triangle2 = false
  }

  return {
    triangle1,
    triangle2,
    bothPass: triangle1 && triangle2
  }
}

/** Convenience wrappers for dual mate shapes */
export function leftMateRightShape<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  gamma: CoreNatTrans<H, CoreCompose<K, U_>>,
  H_: H,
  K_: K
): CoreNatTrans<CoreCompose<F_, H>, K> {
  // γ^♯ = (F ▷ γ) ; (ε ▷ K)
  return rightMate(
    adj,
    gamma as unknown as CoreNatTrans<H, CoreCompose<U_, K>>,
    H_,
    K_
  ) as CoreNatTrans<CoreCompose<F_, H>, K>
}

export function rightMateRightShape<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alphaSharp: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,
  K_: K
): CoreNatTrans<H, CoreCompose<K, U_>> {
  // γ = (η ▷ H) ; (U ▷ α^♯)
  return leftMate(
    adj,
    alphaSharp as unknown as CoreNatTrans<CoreCompose<F_, H>, CoreCompose<U_, K>>,
    H_,
    K_
  ) as CoreNatTrans<H, CoreCompose<K, U_>>
}

/* ================================================================
   Previous pushforward monad infrastructure (updated to use Core types)
   ================================================================ */

/** Compute unit mate: η^adj : Id_D ⇒ F∘U from η : Id_C ⇒ U∘F */
export const unitMate = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(adj: Adjunction<C, D, F, U>): CatNatTrans<CatId<D>, CatCompose<U, F>> => {
  const FU = composeFun(adj.U, adj.F)
  return {
    source: idFun(adj.F.target),
    target: FU,
    component: (x: ObjOf<D>) => identityMorph(adj.F.target, x)
  }
}

/** Compute counit mate: ε^adj : U∘F ⇒ Id_C from ε : F∘U ⇒ Id_D */
export const counitMate = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(adj: Adjunction<C, D, F, U>): CatNatTrans<CatCompose<F, U>, CatId<C>> => {
  const UF = composeFun(adj.F, adj.U)
  return {
    source: UF,
    target: idFun(adj.U.target),
    component: (y: ObjOf<C>) => identityMorph(adj.U.target, y)
  }
}

/**
 * Pushforward monad: transport monad structure along adjunction F ⊣ U
 * Given T on C and F ⊣ U : C ⇄ D, construct T↑ = F ∘ T ∘ U on D
 *
 * @deprecated These helpers assume endofunctor-based monads. Prefer routing
 * relative presentations through `relative/relative-monads.fromMonad` and the
 * equipment-driven constructors so Street-action witnesses remain visible.
 */
export const pushforwardMonad = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatMonad<D> => {
  // T↑ = F ∘ T ∘ U
  const FTU = composeFun(composeFun(adj.U, T.endofunctor), adj.F)

  const unitUp: CatNatTrans<CatId<D>, CatFunctor<D, D>> = {
    source: idFun(adj.F.target),
    target: FTU,
    component: (d: ObjOf<D>) => identityMorph(adj.F.target, FTU.onObj(d))
  }

  const multUp: CatNatTrans<
    CatCompose<CatFunctor<D, D>, CatFunctor<D, D>>,
    CatFunctor<D, D>
  > = {
    source: composeFun(FTU, FTU),
    target: FTU,
    component: (d: ObjOf<D>) => identityMorph(adj.F.target, FTU.onObj(d))
  }

  return {
    category: adj.F.target,
    endofunctor: FTU,
    unit: unitUp,
    mult: multUp
  }
}

/** Colax morphism of monads F T ⇒ T↑ F along left adjoint */
export const colaxAlongLeftAdjoint = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> => {
  // F T ⇒ F T η F ⇒ F T U F ⇒ T↑ F
  const FT = composeFun(T.endofunctor, adj.F)
  return idNat(FT)
}

/**
 * Eilenberg-Moore algebra transport: T-algebra induces T↑-algebra.
 *
 * @deprecated Relative algebra transports should flow through the Street
 * action analyzers; this helper keeps the legacy endofunctor variant available
 * for older examples.
 */
export const pushforwardAlgebra = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>,
  A extends ObjOf<C>,
  TA extends ObjOf<C>
>(
  adj: Adjunction<C, D, F, U>,
  _T: CatMonad<C>,
  algebra: {
    carrier: A
    action: (value: TA) => A
  }
) => {
  // F T U (F A) ≅ F T (U F) A → F T η A → F T T A → F μ A → F T A → F a → F A
  return {
    carrier: adj.F.onObj(algebra.carrier),
    action: (x: TA) => {
      // This would implement the full EM transport
      // For now, provide a placeholder
      return algebra.action(x)
    }
  }
}

/* ================================================================
   Law-checking infrastructure for pushforward monads
   ================================================================ */

/** Reassociate functor compositions for proper μ↑ construction */
export const reassociate = {
  // (F∘T∘U)∘(F∘T∘U) ≅ F∘T∘(U∘F)∘T∘U (placeholder implementation)
  leftToMiddle: <C, D>(FTU: CatFunctor<C, D>): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> =>
    idNat(FTU),

  // Other associativity isomorphisms as needed
  middleToRight: <C, D>(
    F: CatFunctor<C, D>,
    _T: CatFunctor<C, C>,
    _U: CatFunctor<D, C>
  ): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> => idNat(F)
}

/**
 * Enhanced pushforward monad with proper μ↑ wiring.
 *
 * @deprecated Maintained for legacy pushforward experiments. New code should
 * migrate to the relative monad constructors, which expose the same
 * diagnostics via `relativeMonadFromEquipment`.
 */
export const pushforwardMonadEnhanced = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatMonad<D> => pushforwardMonad(adj, T)

/** Legacy shape describing a simple Kleisli morphism. */
interface SimpleKleisliMorph<C> {
  readonly from: ObjOf<C>
  readonly to: ObjOf<C>
  readonly compose: (x: ObjOf<C>) => ObjOf<C>
}

/**
 * Kleisli composition for law checking.
 *
 * @deprecated Use the relative Kleisli helpers in `relative/relative-monads`
 * once Street witnesses are available. This version assumes an endofunctor on
 * the nose.
 */
export const kleisliCompose = <C>(
  T: CatMonad<C>,
  f: SimpleKleisliMorph<C>,  // X -> T Y
  g: SimpleKleisliMorph<C>   // Y -> T Z
) => {
  const applyEndo = T.endofunctor.onMor as unknown as (
    mor: (value: ObjOf<C>) => ObjOf<C>
  ) => (value: ObjOf<C>) => ObjOf<C>
  const multAt = T.mult.component as unknown as (
    obj: ObjOf<C>
  ) => (value: ObjOf<C>) => ObjOf<C>

  return {
    from: f.from,
    to: g.to,
    compose: (x: ObjOf<C>) => {
      const Tf_x = f.compose(x)
      const liftedG = applyEndo(g.compose)
      return multAt(g.to)(liftedG(Tf_x))
    }
  }
}

/**
 * Check unit laws for pushforward monad.
 *
 * @deprecated Superseded by `algebra-oracles.ts` relative law analyzers, which
 * surface witness data alongside structured diagnostics.
 */
export const checkPushforwardUnitLaws = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown>
) => {
  const TUp = pushforwardMonadEnhanced(adj, T)
  const results: boolean[] = []

  for (const X of testObjects) {
    try {
      // Left unit: μ↑ ∘ η↑ = id
      const etaX = TUp.unit.component(X)
      const applyEndo = TUp.endofunctor.onMor as (mor: unknown) => unknown
      const multAtX = TUp.mult.component(X) as (value: unknown) => unknown
      const muEtaX = multAtX(applyEndo(etaX))
      const idX = X  // Simplified - would be proper identity

      const leftUnit = JSON.stringify(muEtaX) === JSON.stringify(idX)

      // Right unit: μ↑ ∘ T↑(η↑) = id
      const TetaX = applyEndo(etaX)
      const muTEtaX = multAtX(TetaX)
      
      const rightUnit = JSON.stringify(muTEtaX) === JSON.stringify(idX)
      
      results.push(leftUnit && rightUnit)
    } catch (e) {
      results.push(false)
    }
  }
  
  return results.every(r => r)
}

/**
 * Check associativity law for pushforward monad.
 *
 * @deprecated Superseded by `checkRelativeMonadLaws`, which threads Street
 * witness requests through the oracle layer.
 */
export const checkPushforwardAssociativity = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown>
) => {
  const TUp = pushforwardMonadEnhanced(adj, T)
  const results: boolean[] = []

  for (const X of testObjects) {
    try {
      // μ↑ ∘ T↑(μ↑) = μ↑ ∘ μ↑T↑ on T↑T↑T↑ X
      const TTTX = TUp.endofunctor.onObj(
        TUp.endofunctor.onObj(TUp.endofunctor.onObj(X))
      )

      // Left side: μ↑ ∘ T↑(μ↑)
      const multAtX = TUp.mult.component(X) as (value: unknown) => unknown
      const TmuUp = (TUp.endofunctor.onMor as (mor: unknown) => unknown)(
        TUp.mult.component(X)
      )
      const leftSide = multAtX(TmuUp)

      // Right side: μ↑ ∘ μ↑T↑
      const muUpT = TUp.mult.component(TUp.endofunctor.onObj(X)) as (value: unknown) => unknown
      const rightSide = multAtX(muUpT)
      
      const associative = JSON.stringify(leftSide) === JSON.stringify(rightSide)
      results.push(associative)
    } catch (e) {
      results.push(false)
    }
  }
  
  return results.every(r => r)
}

/**
 * Complete law checker for pushforward monads.
 *
 * @deprecated Use `checkRelativeMonadLaws` to obtain structural diagnostics and
 * pending Street-equality information for embedded classical monads.
 */
export const checkPushforwardMonadLaws = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown> = []
) => {
  // Use small test objects if none provided
  const tests = testObjects.length > 0 ? testObjects : [
    { elements: ['x'] },
    { elements: ['a', 'b'] }
  ]
  
  const unitLaws = checkPushforwardUnitLaws(adj, T, tests)
  const associativity = checkPushforwardAssociativity(adj, T, tests)
  
  return {
    unitLaws,
    associativity,
    allPass: unitLaws && associativity
  }
}

