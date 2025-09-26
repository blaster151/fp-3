import {
  Arrow,
  Path,
  allCommute,
  allCommuteTweaked,
  commutes,
  commutesTweaked,
  composePath,
  id,
  isIdentity,
  paste,
} from "../diagram";

const log = (label: string, value: unknown) => {
  console.log(label.padEnd(32), "→", value);
};

// 1) Triangle associativity: (j ∘ h) ∘ g = j ∘ (h ∘ g)
{
  const g: Arrow<number, number> = x => x + 1;
  const h: Arrow<number, number> = x => x * 2;
  const j: Arrow<number, number> = x => x - 3;

  const left: Path<number, number> = [g, h, j];
  const right: Path<number, number> = [g, (x: number) => j(h(x))];
  const sample = [0, 1, 2, 5];

  log("triangle commutes?", commutes(left, right, sample));
  log("composite equals?", sample.map(x => composePath(left)(x)));
}

// 2) Identities behave neutrally: f ∘ 1 = f = 1 ∘ f
{
  const f: Arrow<string, string> = s => s.toUpperCase();
  const one = id<string>();
  const sample = ["a", "Ab", "xyz"];

  log("is identity?", isIdentity([one], sample));
  log("f after identity", commutes([one, f], [f], sample));
  log("identity after f", commutes([f, one], [f], sample));
}

// 3) Pasting commuting squares yields a commuting rectangle
{
  const f: Arrow<number, number> = x => x + 1; // A → B
  const g: Arrow<number, number> = x => x * 2; // B → C
  const j: Arrow<number, number> = x => (x + 1) * 2; // A → C matches g ∘ f

  const h: Arrow<number, number> = x => x - 1; // C → D
  const k: Arrow<number, number> = x => x * 3; // D → E
  const l: Arrow<number, number> = x => (x - 1) * 3; // C → E matches k ∘ h

  const squareLeft: Path<number, number>[] = [
    [f, g],
    [j],
  ];
  const squareRight: Path<number, number>[] = [
    [h, k],
    [l],
  ];

  const rect1 = paste(squareLeft[0], squareRight[0]);
  const rect2 = paste(squareLeft[1], squareRight[1]);
  const sample = [0, 3];

  log("left square commutes?", allCommute(squareLeft, sample));
  log("right square commutes?", allCommute(squareRight, sample));
  log("pasted rectangle commutes?", commutes(rect1, rect2, sample));
}

// 4) Tweaked commutativity: forks need not collapse parallel arrows
{
  const e: Arrow<number, number> = () => 0;
  const f: Arrow<number, number> = a => a + 1;
  const g: Arrow<number, number> = () => 1;
  const sampleE = [0, 1, 2];
  const sampleA = [3, 4];

  log("parallel arrows allowed", commutesTweaked([f], [g], sampleA));
  log("fork commutes", commutesTweaked([f, e], [g, e], sampleE));
  log(
    "detects non-commuting",
    !commutesTweaked([f, () => 2], [g, e], sampleE)
  );
}

// 5) Tweaked family commutativity helper
{
  const e: Arrow<number, number> = () => 0;
  const f: Arrow<number, number> = a => a + 1;
  const g: Arrow<number, number> = () => 1;

  log(
    "family commutes (tweaked)",
    allCommuteTweaked(
      [
        [f],
        [g],
        [f, e],
        [g, e],
      ],
      [0, 1, 2]
    )
  );
}
