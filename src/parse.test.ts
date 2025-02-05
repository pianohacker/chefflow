import { describe, test, expect } from "vitest";
import { Ingredient, LineError, parseRecipe, Recipe } from "./parse";

describe("parseRecipe()", () => {
  // Convenience function for making parsed Recipe objects.
  //
  // Basically, this function takes a function that's given an i() function that either:
  //   * adds an ingredient, or
  //   * references a previously used ingredient
  //
  // and returns a Recipe.
  const makeResult = (
    template: (i: (x: number | Ingredient) => Ingredient) => Recipe,
    errors: LineError[] = [],
  ): ReturnType<typeof parseRecipe> => {
    const ingredients: Ingredient[] = [];

    return { recipe: template((x) => (typeof x === "number" ? ingredients[x] : (ingredients.push(x), x))), errors };
  };

  test.each<{ desc: string; input: string; result: ReturnType<typeof parseRecipe> }>([
    {
      desc: "empty recipe",
      input: "",
      result: {
        recipe: {
          ingredients: [],
          stepTree: { desc: "", inputs: [] },
        },
        errors: [],
      },
    },
    {
      desc: "one-ingredient one-step recipe",
      input: "sautee: 5 onions",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 })],
        stepTree: { desc: "sautee", inputs: [i(0)] },
      })),
    },
    {
      desc: "multi-ingredient one-step recipe",
      input: "sautee: 5 onions, 3 radishes",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 }), i({ type: "radishes", amount: 3 })],
        stepTree: {
          desc: "sautee",
          inputs: [i(0), i(1)],
        },
      })),
    },
    {
      desc: "multi-ingredient one-step recipe with basic units",
      input: "sautee: 5 onions, 3 cloves of garlic",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 }), i({ type: "cloves of garlic", amount: 3 })],
        stepTree: {
          desc: "sautee",
          inputs: [i(0), i(1)],
        },
      })),
    },
    {
      desc: "multi-step recipe with custom backreference names",
      input: `
      crush @paste: 2 snozzberries
      simmer: @paste
      `,
      result: makeResult((i) => ({
        ingredients: [i({ type: "snozzberries", amount: 2 })],
        stepTree: {
          desc: "simmer",
          inputs: [
            {
              desc: "crush",
              inputs: [i(0)],
              resultName: "paste",
            },
          ],
        },
      })),
    },
    // Adapted from https://www.makebetterfood.com/recipes/garlic-bread/
    {
      desc: "multi-ingredient multi-step recipe with basic units",
      input: `
      slice in half: 2 loaves of Italian bread
      roast without peeling: 1 head of garlic
      soften: 12 tbsp butter
      grate: .5 cup Parmesan
      peel and mince: @garlic
      mix: @butter, @Parmesan, @garlic, 1 tsp salt, 1 tsp black pepper
      spread: @bread, @butter
      bake: @bread
      `,
      result: makeResult((i) => ({
        ingredients: [
          i({ type: "loaves of Italian bread", amount: 2 }),
          i({ type: "head of garlic", amount: 1 }),
          i({ type: "butter", unit: "tbsp", amount: 12 }),
          i({ type: "Parmesan", unit: "cup", amount: 0.5 }),
          i({ type: "salt", unit: "tsp", amount: 1 }),
          i({ type: "black pepper", unit: "tsp", amount: 1 }),
        ],
        stepTree: {
          desc: "bake",
          inputs: [
            {
              desc: "spread",
              inputs: [
                { desc: "slice in half", inputs: [i(0)] },
                {
                  desc: "mix",
                  inputs: [
                    { desc: "soften", inputs: [i(2)] },
                    { desc: "grate", inputs: [i(3)] },
                    { desc: "peel and mince", inputs: [{ desc: "roast without peeling", inputs: [i(1)] }] },
                    i(4),
                    i(5),
                  ],
                },
              ],
            },
          ],
        },
      })),
    },
    {
      desc: "multi-step recipe with errors",
      input: `crush @paste: 2 snozzberries
      nonsense
      simmer: @paste, bad ingredients, @nonexistent
      `,
      result: makeResult(
        (i) => ({
          ingredients: [i({ type: "snozzberries", amount: 2 })],
          stepTree: {
            desc: "simmer",
            inputs: [
              {
                desc: "crush",
                inputs: [i(0)],
                resultName: "paste",
              },
            ],
          },
        }),
        [
          { line: 2, error: expect.stringMatching(/unrecognized/i) },
          { line: 3, error: expect.stringMatching(/not.*bad ingredients/i) },
          { line: 3, error: expect.stringMatching(/find.*@nonexistent/i) },
        ],
      ),
    },
  ])("parses $desc correctly", ({ input, result }) => {
    expect(parseRecipe(input)).toEqual(result);
  });
});
