import escapeStringRegexp from "escape-string-regexp";
import { knownUnits } from "./units";

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
  lineNum: number;
};
export const isStep = (x: object): x is Step => !!("desc" in x && x.desc && "inputs" in x && x.inputs);

export interface Recipe {
  ingredients: Ingredient[];
  results: Step[];
}

export interface LineError {
  lineNum: number;
  error: string;
}

/**
 * Breadth-first walk through recipe inputs.
 */
export function walkInputs<T>(results: Step[], fn: (input: Step | Ingredient) => T | undefined): T | undefined {
  const walkQueue: (Step | Ingredient)[] = Array.from(results);

  while (walkQueue.length) {
    const input = walkQueue.shift()!;
    const result = fn(input);

    if (result !== undefined) return result;

    if (isStep(input)) walkQueue.push(...input.inputs);
  }
}

const UNIT_RE = Array.from(knownUnits).join("|");
const INGREDIENT_RE = new RegExp(`(?:(\\d+/\\d+|\\d+|\\.\\d+|\\d+\\.\\d+)\\s+)?(?:(${UNIT_RE})\\s+)?(.*)`);

export function parseRecipe(input: string): { recipe: Recipe; errors: LineError[] } {
  const errors: LineError[] = [];

  const lines = input
    .split("\n")
    .map((line, i): [string, number] => [line.trim(), i + 1])
    .filter(([line]) => !!line)
    .map(([line, lineNum]): [string[], number] => [line.trim().split(/\s*:\s*/, 2), lineNum])
    .filter(([line, lineNum]) => {
      if (line.length != 2) {
        errors.push({ lineNum, error: "Unrecognized line (missing colon)" });

        return false;
      }

      return true;
    });

  const ingredients: Ingredient[] = [];
  const results: Step[] = [];

  for (const [[descText, inputsText], lineNum] of lines) {
    const [desc, resultName] = descText.split(/\s+@/, 2);

    const newInputs = inputsText
      .split(/\s*,\s*/)
      .map((inputText) => {
        if (inputText == "") {
          errors.push({ lineNum, error: "Empty ingredient" });
          return null;
        }

        if (inputText == "^" || inputText == "above") {
          if (results[0]) {
            return results.pop();
          } else {
            errors.push({ lineNum, error: "Reference to last result with no previous results" });
            return null;
          }
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

          const refIndex = results.findLastIndex((result) => {
            if (isStep(result)) {
              if (result.resultName && refRe.test(result.resultName)) return true;

              if (
                walkInputs([result], (input) => {
                  if (isIngredient(input) && refRe.test(input.type)) {
                    return true;
                  }
                })
              )
                return true;
            }

            if (isIngredient(result) && refRe.test(result.type)) return true;

            return false;
          });

          if (refIndex == -1) {
            errors.push({ lineNum, error: `Can't find result @${ref}` });
            return null;
          } else {
            return results.splice(refIndex, 1)[0];
          }
        }

        const ingredientMatch = INGREDIENT_RE.exec(inputText);
        if (ingredientMatch) {
          const [, amount, unit, type] = ingredientMatch;

          let parsedAmount;

          if (amount) {
            parsedAmount = parseFloat(amount);

            if (amount.includes("/")) {
              const [num, den] = amount.split("/");

              parsedAmount = parseFloat(num) / parseFloat(den);
            }
          }

          const ingredient = { amount: parsedAmount, unit, type: type };
          ingredients.push(ingredient);

          return ingredient;
        }

        errors.push({ lineNum, error: `Not an ingredient or result: ${inputText}` });
        return null;
      })
      .filter((m) => !!m);

    results.push({ desc, resultName, inputs: newInputs, lineNum });
  }

  return { recipe: { ingredients, results }, errors };
}
