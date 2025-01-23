export type KnownUnit = {
  kind: "weight" | "volume";
  name: string;
} & ({ kind: "weight"; name: "g" } | { kind: "volume"; name: "ml" });
export type Unit = string | KnownUnit;

export type Ingredient = {
  type: string;
  amount?: number;
  unit?: Unit;
};

export type Step = {
  desc: string;
  inputs: (Step | Ingredient)[];
};

export interface Recipe {
  ingredients: Ingredient[];
  stepTree: Step;
}

export function parseRecipe(input: string): Recipe {
  const lines = input
    .split("\n")
    .map((line) => line.split(/\s*:\s*/, 2))
    .filter((l) => l.length == 2);

  const ingredients = [];
  const inputs = [];

  for (const [desc, inputsText] of lines) {
    const newInputs = inputsText
      .split(/\s*,\s*/)
      .map((inputText) => /(?:(\d+)(?:\s+(\S+)\s+of)?\s+)(.*)/.exec(inputText))
      .filter((m) => !!m)
      .map(([, amount, unit, type]) => ({ amount: parseInt(amount, 10), unit, type: type }));
    ingredients.push(...newInputs);

    inputs.push({ desc, inputs: newInputs });
  }

  return { ingredients, stepTree: inputs[0] || { desc: "", inputs: [] } };
}
