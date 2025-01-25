import { describe, test, expect } from "vitest";
import { Ingredient, parseRecipe, Recipe } from "./parse";

describe("parseRecipe()", () => {
  // Convenience function for making parsed Recipe objects.
  //
  // Basically, this function takes a function that's given an i() function that either:
  //   * adds an ingredient, or
  //   * references a previously used ingredient
  //
  // and returns a Recipe.
  const makeResult = (template: (i: (x: number | Ingredient) => Ingredient) => Recipe): Recipe => {
    const ingredients: Ingredient[] = [];

    return template((x) => (typeof x === "number" ? ingredients[x] : (ingredients.push(x), x)));
  };

  test.each<{ desc: string; input: string; result: Recipe }>([
    {
      desc: "empty recipe",
      input: "",
      result: {
        ingredients: [],
        stepTree: { desc: "", inputs: [] },
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
        ingredients: [i({ type: "onions", amount: 5 }), i({ type: "garlic", amount: 3, unit: "cloves" })],
        stepTree: {
          desc: "sautee",
          inputs: [i(0), i(1)],
        },
      })),
    },
    // Adapted from https://www.makebetterfood.com/recipes/garlic-bread/
    {
      desc: "multi-ingredient multi-step recipe with basic units",
      input: `
      slice in half: 2 loaves of Italian bread
      roast without peeling: 1 head of garlic
      soften: 12 tbsp of butter
      grate: .5 cup of Parmesan
      peel and mince: @garlic
      mix: @butter, @Parmesan, @garlic, 1 tsp of salt, 1 tsp of black pepper
      spread: @bread, @butter
      bake: @bread
      `,
      result: makeResult((i) => ({
        ingredients: [
          i({ type: "Italian bread", unit: "loaves", amount: 2 }),
          i({ type: "garlic", unit: "head", amount: 1 }),
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
  ])("parses $desc correctly", ({ input, result }) => {
    expect(parseRecipe(input)).toEqual(result);
  });
});
