import escapeStringRegexp from "escape-string-regexp";

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
export const isIngredient = (x: object): x is Ingredient => !!("type" in x && x.type);

export type Step = {
  desc: string;
  inputs: (Step | Ingredient)[];
};
export const isStep = (x: object): x is Step => !!("desc" in x && x.desc && "inputs" in x && x.inputs);

export interface Recipe {
  ingredients: Ingredient[];
  stepTree: Step;
}

export function parseRecipe(input: string): Recipe {
  const lines = input
    .split("\n")
    .map((line, i): [string[], number] => [line.trim().split(/\s*:\s*/, 2), i])
    .filter(([l]) => l.length == 2);

  const ingredients: Ingredient[] = [];
  const inputs: (Step | Ingredient)[] = [];

  for (const [[desc, inputsText], i] of lines) {
    const newInputs = inputsText
      .split(/\s*,\s*/)
      .map((inputText) => {
        const ingredientMatch = /(?:(\d+|\.\d+|\d+\.\d+)(?:\s+(.+)\s+of)?\s+)(.*)/.exec(inputText);
        if (ingredientMatch) {
          const [, amount, unit, type] = ingredientMatch;
          const ingredient = { amount: parseFloat(amount), unit, type: type };
          ingredients.push(ingredient);

          return ingredient;
        }

        const refMatch = /^@(.*)/.exec(inputText);
        if (refMatch) {
          const [, ref] = refMatch;

          const refRe = new RegExp(
            ref
              .trim()
              .split(/\s+/)
              .map((word) => `\\b${escapeStringRegexp(word)}\\b`)
              .join(".*"),
          );

          const refIndex = inputs.findIndex((input) => {
            if (isStep(input)) {
              let firstIngredient = input.inputs[0];

              while (firstIngredient) {
                if (isIngredient(firstIngredient)) {
                  return refRe.test(firstIngredient.type);
                }

                firstIngredient = firstIngredient.inputs[0];
              }
            }
            if (isIngredient(input) && refRe.test(input.type)) return true;

            return false;
          });

          if (refIndex == -1) {
            throw new Error(`could not find match for reference @${ref} on line ${i + 1}`);
          } else {
            return inputs.splice(refIndex, 1)[0];
          }
        }

        return null;
      })
      .filter((m) => !!m);

    inputs.push({ desc, inputs: newInputs });
  }

  return { ingredients, stepTree: (inputs[0] as Step) || { desc: "", inputs: [] } };
}
