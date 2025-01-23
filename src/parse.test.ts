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
  ])("parses $desc correctly", ({ input, result }) => {
    expect(parseRecipe(input)).toEqual(result);
  });
});
