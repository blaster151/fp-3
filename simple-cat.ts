export interface SimpleCat<Obj, Arr> {
  readonly id: (object: Obj) => Arr;
  readonly compose: (g: Arr, f: Arr) => Arr;
  readonly src: (arrow: Arr) => Obj;
  readonly dst: (arrow: Arr) => Obj;
}
