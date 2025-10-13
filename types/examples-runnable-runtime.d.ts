declare module 'examples/runnable/types' {
  export const RunnableExample: unique symbol
  export const RunnableOutcome: unique symbol
  export const RunnableRegistry: unique symbol
}

declare module 'examples/runnable/effects' {
  export const Reader: unique symbol
  export const Task: unique symbol
  export const ReaderTask: unique symbol
  export const ReaderTaskResult: unique symbol
  export const ReaderArrow: unique symbol
  export const TaskArrow: unique symbol
  export const ReaderTaskArrow: unique symbol
  export const ReaderTaskResultArrow: unique symbol
}

declare module 'examples/runnable/json-canonical' {
  export const JsonValue: unique symbol
  export const CanonicalPolicy: unique symbol
  export const CollisionReport: unique symbol
  export const CanonicalizationResult: unique symbol
  export const EJson: unique symbol
}

declare module 'examples/runnable/functors' {
  export const SumValue: unique symbol
  export const ProductValue: unique symbol
}
