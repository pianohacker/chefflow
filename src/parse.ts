import escapeStringRegexp from "escape-string-regexp";
import { knownUnits, unitMap } from "./units";

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
  resultName?: string;
  inputs: (Step | Ingredient)[];
};
export const isStep = (x: object): x is Step => !!("desc" in x && x.desc && "inputs" in x && x.inputs);

export interface Recipe {
  ingredients: Ingredient[];
  results: (Step | Ingredient)[];
}

export interface LineError {
  line: number;
  error: string;
}

const UNIT_RE = Array.from(knownUnits).join("|");
const INGREDIENT_RE = new RegExp(`(\\d+|\\.\\d+|\\d+\\.\\d+)(?:\\s+(${UNIT_RE}))?\\s+(.*)`);

export function parseRecipe(input: string): { recipe: Recipe; errors: LineError[] } {
  const errors: LineError[] = [];

  const lines = input
    .split("\n")
    .map((line, i): [string, number] => [line.trim(), i])
    .filter(([line]) => !!line)
    .map(([line, i]): [string[], number] => [line.trim().split(/\s*:\s*/, 2), i])
    .filter(([line, i]) => {
      if (line.length != 2) {
        errors.push({ line: i + 1, error: "Unrecognized line (missing colon)" });

        return false;
      }

      return true;
    });

  const ingredients: Ingredient[] = [];
  const inputs: (Step | Ingredient)[] = [];

  for (const [[descText, inputsText], i] of lines) {
    const [desc, resultName] = descText.split(/\s+@/, 2);

    const newInputs = inputsText
      .split(/\s*,\s*/)
      .map((inputText) => {
        const ingredientMatch = INGREDIENT_RE.exec(inputText);
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
              if (input.resultName && refRe.test(input.resultName)) return true;

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
            errors.push({ line: i + 1, error: `Can't find result @${ref}` });
            return null;
          } else {
            return inputs.splice(refIndex, 1)[0];
          }
        }

        errors.push({ line: i + 1, error: `Not an ingredient or result: ${inputText}` });
        return null;
      })
      .filter((m) => !!m);

    inputs.push({ desc, resultName, inputs: newInputs });
  }

  return { recipe: { ingredients, results: inputs }, errors };
}
