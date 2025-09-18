#!/usr/bin/env ts-node

import {
  ArrayMonoid, WRTE, DoWRTE, WriterReaderTaskEither, isOk
} from './allTS'

async function testDoWRTE() {
  console.log('Testing DoWRTE...')
  
  type Env = { base: string }
  const Log = ArrayMonoid<string>()
  const W = WRTE<readonly string[]>(Log)
  const Do = DoWRTE(W)<Env>()

  const stepOk: WriterReaderTaskEither<readonly string[], Env, never, number> =
    W.chain(() => W.of(2))(W.tell(['start']))

  const program = Do
    .bind('n', stepOk)
    .let('n2', t => t.n * 2)
    .tell(['after n2'])
    .map(t => t.n + t.n2)
    .done

  const [result, logs] = await program({ base: 'test' })
  console.log('Result:', isOk(result) ? `Ok(${result.value})` : `Err(${result.error})`)
  console.log('Logs:', logs)
}

testDoWRTE().catch(console.error)