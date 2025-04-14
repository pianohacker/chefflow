import escapeStringRegexp from "escape-string-regexp";
import { knownUnits } from "../units";
import { Grid } from "./grid";

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
const GRID_MARKER_RE = /^(manual|nha|grid):/i;

function parseIngredient(inputText: string): Ingredient | null {
  const ingredientMatch = INGREDIENT_RE.exec(inputText);
  if (!ingredientMatch) return null;
  const [, amount, unit, type] = ingredientMatch;

  let parsedAmount;

  if (amount) {
    parsedAmount = parseFloat(amount);

    if (amount.includes("/")) {
      const [num, den] = amount.split("/");

      parsedAmount = parseFloat(num) / parseFloat(den);
    }
  }

  return { amount: parsedAmount, unit, type: type };
}

function parseGridRecipe(input: string): { grid: Grid; errors: LineError[] } {
  const errors: LineError[] = [];

  const lines = input
    .split("\n")
    .map((line, i): [string, number] => [line.trim(), i + 1])
    .filter(([line]) => !!line);

  const firstLineIdx = lines.findIndex(([line]) => line && !line.match(GRID_MARKER_RE));
  let column: Grid[0] = [];
  let y = 0;
  const grid: Grid = [column];

  if (firstLineIdx == -1) return { grid, errors };

  let lastLineNum = lines[firstLineIdx][1];
  for (const [line, lineNum] of lines.slice(firstLineIdx)) {
    if (lineNum - lastLineNum > 1) {
      column = [];
      y = 0;
      grid.push(column);
    }

    const stepMatch = /^(.*)\((\d+)\)$/.exec(line);
    const step = stepMatch && { desc: stepMatch[1].trimEnd(), size: parseInt(stepMatch[2]) };
    const ingredient = parseIngredient(line);

    if (step) {
      column[y] = {
        size: step.size,
        extent: 1,
        input: { desc: step.desc, inputs: [], lineNum },
        children: [],
      };
      y += step.size;
    } else if (ingredient) {
      column[y] = {
        size: 1,
        extent: 1,
        input: { ...ingredient, lineNum },
        children: [],
      };
      y += 1;
    } else {
      errors.push({ lineNum, error: "Unrecognized line" });
    }

    lastLineNum = lineNum;
  }

  // This is important because other functions use the first column's height to determine the entire
  // grid's height
  const maxColumnHeight = grid.reduce((accum, column) => Math.max(accum, column.length), 0);
  if (grid[0].length < maxColumnHeight) grid[0].length = maxColumnHeight;

  return { grid, errors };
}

export function parseRecipe(
  input: string,
): { recipe: Recipe; errors: LineError[] } | { grid: Grid; errors: LineError[] } {
  const errors: LineError[] = [];

  if (input.trimStart().match(GRID_MARKER_RE)) return parseGridRecipe(input);

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

        const ingredient = parseIngredient(inputText);
        if (ingredient) {
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
