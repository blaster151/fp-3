export const FP_CATALOG = {
  // Core algebraic structures
  Semiring: 'Abstract algebra: (R, +, ×, 0, 1) with matrix operations',
  Ring: 'Semiring + additive inverses for chain complexes',
  Field: 'Ring + multiplicative inverses for exact linear algebra',

  // Practical semirings
  SemiringMinPlus: 'Shortest paths, edit distance, DP minimization',
  SemiringMaxPlus: 'Viterbi/best path, longest path in DAGs',
  SemiringBoolOrAnd: 'Reachability, DFA acceptance, Boolean DP',
  SemiringProb: 'Probabilities, HMMs, stochastic models',

  // Matrix operations
  matMul: 'Matrix multiplication over arbitrary semirings',
  kron: 'Kronecker product for tensor operations',
  powMat: 'Fast O(log k) matrix exponentiation',
  vecMat: 'Vector-matrix multiplication for state updates',

  // Graph algorithms
  countPathsOfLength: 'Exact L-length path enumeration',
  reachableWithin: 'Bounded reachability via matrix closure',
  shortestPathsUpTo: 'All-pairs shortest paths without coding Dijkstra',
  transitiveClosureBool: 'Warshall transitive closure',

  // Language processing
  compileRegexToWA: 'Regex → weighted automaton with full POSIX support',
  waRun: 'Execute weighted automaton on word sequence',
  waAcceptsBool: 'Boolean acceptance for DFA-style checking',
  hmmForward: 'Hidden Markov Model forward algorithm',

  // Category theory
  Entwining: 'Bridge between algebras and corings with 4-law checking',
  EntwinedModule: 'Modules with compatible algebra action and coring coaction',
  categoryOfEntwinedModules: 'Complete category with safe composition',

  // Homological algebra
  Complex: 'Chain complexes with d² = 0 validation',
  ChainMap: 'Morphisms with commutative diagram checking',
  Triangle: 'Distinguished triangles via mapping cone',
  ExactFunctor: 'Functors preserving shift and cone structures',

  // Linear algebra backends
  rrefQPivot: 'Rational RREF with magnitude pivoting over Q',
  FieldQ: 'Exact rational arithmetic with bigint (no floating point errors)',
  nullspace: 'Kernel computation over arbitrary fields',
  solveLinear: 'Linear system solver with exact arithmetic',

  // Advanced homological structures
  imageComplex: 'Im(f) as a subcomplex of Y with inclusion',
  coimageComplex: 'Coim(f) as a quotient of X with projection',
  coimToIm: 'Canonical chain-map Coim(f) → Im(f) (iso over fields)',
  makeHomologyShiftIso: 'Natural iso H_n(X[1]) ≅ H_{n-1}(X) with witness matrices',

  // Exactness verification
  checkLongExactConeSegment: 'Verify LES exactness for mapping cone triangles',
  smoke_coim_im_iso: 'Quick verification that coim→im is isomorphism',
  runLesConeProps: 'Property-based testing of LES on random complexes',

  // Law checkers (runtime verification)
  complexIsValid: 'Verify d² = 0 and shape compatibility',
  isChainMap: 'Verify chain map commutative diagram',
  triangleIsSane: 'Verify distinguished triangle structure',
  comoduleCoassocHolds: 'Verify comodule coassociativity law',
  entwiningCoassocHolds: 'Verify entwining Brzeziński–Majid laws',

  // Diagram toolkit
  reindexDisc: 'Reindex a discrete diagram along u: J→I',
  coproductComplex: 'Coproduct (degreewise direct sum) of complexes',
  productComplex: 'Product (degreewise direct product) of complexes',
  LanDisc: 'Left Kan extension for discrete u: J→I (fiberwise coproduct)',
  RanDisc: 'Right Kan extension for discrete u: J→I (fiberwise product)',
  checkBeckChevalleyDiscrete: 'Lan∘reindex ≅ reindex∘Lan on pullback squares (discrete)',

  // Backend selection
  createRrefResolver: 'Create scoped RREF overrides (e.g., resolver.register(FieldQ, rrefQPivot))',

  // Poset diagrams and Kan extensions
  makePosetDiagram: 'Build diagram over finite poset with transitive composition',
  pushoutInDiagram: 'Pushout of cospan in a poset diagram',
  pullbackInDiagram: 'Pullback of span in a poset diagram',
  LanPoset: 'Left Kan extension along monotone map with TRUE universal morphisms',
  RanPoset: 'Right Kan extension along monotone map with TRUE universal morphisms',

  // Vector space bridge
  VS: 'Create vector space over a field',
  idL: 'Identity linear map',
  composeL: 'Compose linear maps',
  linToChain: 'Convert linear map to one-degree chain map',
  complexSpaces: 'Extract vector spaces from complex degrees',
  toVectAtDegree: 'Extract Vect diagram at fixed degree from poset diagram',
  arrowMatrixAtDegree: 'Get matrix for specific arrow at degree n',

  // Pretty-printing
  ppMatrix: 'Pretty-print matrix with readable formatting',
  ppChainMap: 'Pretty-print chain map with degree-wise breakdown',
  ppVectDiagramAtDegree: 'Pretty-print vector space diagram',

  // Smith Normal Form (integers)
  smithNormalForm: 'Compute U*A*V = S diagonal form over integers (PID)',

  // Algebra bridges
  applyRepAsLin: 'Convert ring representation to linear map',
  coactionAsLin: 'Convert comodule coaction to linear map V → V⊗C',
  pushCoaction: 'Push linear map across coaction: (id⊗g)∘δ',
  actionToChain: 'Convert action to chain map at degree n',
  coactionToChain: 'Convert coaction to chain map at degree n',

  // Diagram closure and validation
  'DiagramClosure.saturate': 'Auto-synthesize composite arrows from covers',
  'DiagramClosure.composeChainMap': 'Compose chain maps with automatic caching',
  'DiagramLaws.validateFunctoriality': 'Check identity and composition laws in diagrams',

  // Indexed families
  'IndexedFamilies.familyToDiscDiagram': 'Convert function I→Complex to DiscDiagram',
  'IndexedFamilies.discDiagramToFamily': 'Convert DiscDiagram to function I→Complex',
  'IndexedFamilies.mapFamily': 'Map over indexed family pointwise',
  'IndexedFamilies.collectFamily': 'Collect family values to array (finite)',
  'IndexedFamilies.reduceFamily': 'Reduce over family values',
  'IndexedFamilies.familyLanDisc': 'Left Kan extension on families via discrete diagrams',
  'IndexedFamilies.reindexFamily': 'Reindex family along function',
  'IndexedFamilies.reindex': 'General reindexing for arbitrary family types',
  'IndexedFamilies.sigma': 'Dependent sum (Σ): disjoint union of fibers',
  'IndexedFamilies.pi': 'Dependent product (Π): choice functions',
  'IndexedFamilies.sigmaFromRecord': 'Extract tagged union from record',
  'IndexedFamilies.imageCarrier': 'Compute image of carrier under function',
  'IndexedFamilies.sigmaEnum': 'Dependent sum for enumerable families',
  'IndexedFamilies.piEnum': 'Dependent product for enumerable families',
  'IndexedFamilies.lanEnum': 'Left Kan extension for enumerable families',
  'IndexedFamilies.ranEnum': 'Right Kan extension for enumerable families',
  'IndexedFamilies.familyFromArray': 'Sugar: create family from array',
  'IndexedFamilies.familyFromRecord': 'Sugar: create family from record',
  'IndexedFamilies.pullbackIndices': 'Compute pullback indices for Beck-Chevalley tests',
  'IndexedFamilies.unitPiEnum': 'Π-side unit: A(i) → Π_{j ∈ u^{-1}(i)} A(i)',
  'IndexedFamilies.counitPiEnum': 'Π-side counit: (u^* Π_u B)(j) → B(j)',
  'IndexedFamilies.unitSigmaEnum': 'Σ-side unit: Y(u(j)) → (u^* Σ_u Y)(j)',
  'IndexedFamilies.counitSigmaEnum': 'Σ-side counit: (Σ_u u^* X)(i) → X(i)',
  'IndexedFamilies.sigmaOfUnitEnum': 'Σ-side second triangle helper: (Σ_u η)_i',
  'IndexedFamilies.counitOfSigmaEnum': 'Σ-side triangle counit: (ε Σ_u)_i',
  'IndexedFamilies.piOfCounitEnum': 'Π-side triangle counit: (Π_u ε)_j',
  'IndexedFamilies.pullbackUnitEnum': 'Pull back Π-unit along function',
  'IndexedFamilies.pullbackCounitEnum': 'Pull back Σ-counit along function',
  'IndexedFamilies.enumerateBeckChevalleySquare': 'List data for Beck-Chevalley verification',
  'IndexedFamilies.checkBeckChevalleyEnum': 'Check Beck-Chevalley via enumeration',
  'IndexedFamilies.checkUnitCounitTriangles': 'Check unit/counit triangle identities',
  'IndexedFamilies.checkUnitCounitEnumerated': 'Enumerate triangles for unit/counit checks',
  'IndexedFamilies.transpose': 'Transpose family of arrays -> array of family values',

  // Arrow families (for diagrams)
  'ArrowFamilies.make': 'Build arrow family with domain/codomain data',
  'ArrowFamilies.compose': 'Compose arrow families pointwise',
  'ArrowFamilies.id': 'Identity arrow family for diagram',
  'ArrowFamilies.toDiagram': 'Convert arrow family to diagram object',

  // Enhanced Vect (matrix helpers for diagrams)
  'EnhancedVect.blocks': 'Build block matrices from array of matrices',
  'EnhancedVect.directSum': 'Direct sum of linear maps as block diagonal matrix',
  'EnhancedVect.kronecker': 'Kronecker product for diagrammatic linear maps',
  'EnhancedVect.compose': 'Compose enhanced linear maps with caching',

  // Category limits toolkit
  'CategoryLimits.binaryProduct': 'Construct binary product in diagrammatic category',
  'CategoryLimits.binaryCoproduct': 'Construct binary coproduct in diagrammatic category',
  'CategoryLimits.equalizer': 'Equalizer construction with witnesses',
  'CategoryLimits.coequalizer': 'Coequalizer construction with witnesses',

  // Finite poset utilities
  makeFinitePoset: 'Build finite poset with explicit Hasse diagram',
  makePosetDiagramCompat: 'Create poset diagram with compatibility checks',
  idChainMapCompat: 'Identity chain map specialized for compatibility tests',
  randomTwoTermComplex: 'Generate random 2-term complexes for smoke tests',

  // Catalog terminator (keep trailing comma for easy diffing)
  _: '---'
} as const
