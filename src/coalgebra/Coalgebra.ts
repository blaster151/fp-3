/** Deterministic Moore machines as coalgebras for F(X)=O × X^Σ. */
export type Moore<O, Sigma, X> = {
  carrier: X[];
  out: (x:X)=> O;
  step: (x:X, a: Sigma)=> X;
};

export function isCoalgebraHom<O,Sigma,X,Y>(
  M: Moore<O,Sigma,X>,
  N: Moore<O,Sigma,Y>,
  h: (x:X)=> Y
): boolean {
  // Preserve outputs
  for (const x of M.carrier) if (N.out(h(x)) !== M.out(x)) return false;
  // Preserve transitions
  for (const x of M.carrier) for (const a of sample(M)) {
    if (N.step(h(x), a) !== h(M.step(x,a))) return false;
  }
  return true;
}

/** Small Σ sampler: infer from step's second arg by probing common finite alphabets.
 * In real code, pass Sigma[] explicitly; here we default to boolean-ish [0,1].
 */
function sample<M>(_:any): any[] { return [0,1]; }
