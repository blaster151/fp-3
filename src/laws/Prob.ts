import type { Law, Lawful } from "./Witness";
import { DistMonad, eqDist } from "../prob/Dist";

export function lawfulDistNumber(): Lawful<number, typeof DistMonad> {
  const tag = "Prob/Dist/Monad<number>";
  const eq = (a:number,b:number)=>a===b;
  const of = DistMonad.of, ch = DistMonad.chain;

  const laws: Law<any>[] = [
    {
      name: "left identity",
      check: ()=> [0,1,2].every(a => {
        const f = (x:number)=> [{x:x+1,p:0.4},{x:x+2,p:0.6}];
        return eqDist(eq, ch(of(a), f), f(a));
      })
    },
    {
      name: "right identity",
      check: ()=> [[{x:1,p:1}], [{x:1,p:0.3},{x:2,p:0.7}]].every(m => eqDist(eq, ch(m, of), m))
    },
    {
      name: "associativity",
      check: ()=> {
        const f = (a:number)=> [{x:a+1,p:0.5},{x:a*2,p:0.5}];
        const g = (b:number)=> [{x:b-1,p:0.3},{x:b+3,p:0.7}];
        const ms = [[{x:1,p:1}], [{x:2,p:0.4},{x:3,p:0.6}]];
        return ms.every(m => {
          const lhs = ch(ch(m,f), g);
          const rhs = ch(m, a => ch(f(a), g));
          return eqDist(eq, lhs, rhs);
        });
      }
    }
  ];

  return { tag, eq, struct: DistMonad, laws };
}
