import { describe, test, expect } from "vitest";
import { Ingredient, LineError, parseRecipe, Recipe, Step } from ".";
import { Node } from "./grid";

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

  const makeGridResult = ({
    grid,
    errors,
  }: {
    grid: ((Pick<Node, "size"> & { lineNum: number } & (Pick<Step, "desc"> | Ingredient)) | undefined)[][];
    errors: LineError[];
  }): ReturnType<typeof parseRecipe> => ({
    grid: grid.map((column) =>
      column.map((elem) => {
        if (elem == null) return null;

        const { size, lineNum, ...rest } = elem;
        if ("desc" in rest) {
          return { size, extent: 1, input: { desc: rest.desc, inputs: [], lineNum }, children: [] };
        } else {
          return { size, extent: 1, input: { ...rest, lineNum }, children: [] };
        }
      }),
    ),
    errors,
  });

  test.each<{ desc: string; input: string; result: ReturnType<typeof parseRecipe> }>([
    {
      desc: "empty recipe",
      input: "",
      result: {
        recipe: {
          ingredients: [],
          results: [],
        },
        errors: [],
      },
    },
    {
      desc: "one-ingredient one-step recipe",
      input: "sautee: 5 onions",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 })],
        results: [{ desc: "sautee", inputs: [i(0)], lineNum: 1 }],
      })),
    },
    {
      desc: "one-ingredient one-step recipe with fractions",
      input: "sautee: 1/4 tsp salt",
      result: makeResult((i) => ({
        ingredients: [i({ type: "salt", amount: 0.25, unit: "tsp" })],
        results: [{ desc: "sautee", inputs: [i(0)], lineNum: 1 }],
      })),
    },
    {
      desc: "multi-ingredient one-step recipe",
      input: "sautee: 5 onions, 3 radishes",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 }), i({ type: "radishes", amount: 3 })],
        results: [
          {
            desc: "sautee",
            inputs: [i(0), i(1)],
            lineNum: 1,
          },
        ],
      })),
    },
    {
      desc: "multi-ingredient one-step recipe with basic units",
      input: "sautee: 5 onions, 3 cloves of garlic",
      result: makeResult((i) => ({
        ingredients: [i({ type: "onions", amount: 5 }), i({ type: "cloves of garlic", amount: 3 })],
        results: [
          {
            desc: "sautee",
            inputs: [i(0), i(1)],
            lineNum: 1,
          },
        ],
      })),
    },
    {
      desc: "multi-step recipe with non-first and ambiguous backreference names",
      input: `
      frobnicate @frob: 2 potatoes
      incinerate: sea salt, 4 potatoes
      blend: long pepper, @potatoes
      splash: @potatoes, @frob
      `,
      result: makeResult((i) => ({
        ingredients: [
          i({ type: "potatoes", amount: 2 }),
          i({ type: "sea salt" }),
          i({ type: "potatoes", amount: 4 }),
          i({ type: "long pepper" }),
        ],
        results: [
          {
            desc: "splash",
            inputs: [
              {
                desc: "blend",
                inputs: [
                  i(3),
                  {
                    desc: "incinerate",
                    inputs: [i(1), i(2)],
                    lineNum: 3,
                  },
                ],
                lineNum: 4,
              },
              {
                desc: "frobnicate",
                inputs: [i(0)],
                resultName: "frob",
                lineNum: 2,
              },
            ],
            lineNum: 5,
          },
        ],
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
        results: [
          {
            desc: "simmer",
            inputs: [
              {
                desc: "crush",
                inputs: [i(0)],
                resultName: "paste",
                lineNum: 2,
              },
            ],
            lineNum: 3,
          },
        ],
      })),
    },
    {
      desc: "multi-step recipe with shortcut backreference",
      input: `
      crush: 2 snozzberries
      simmer: ^, bozzsnerries
      bifurcate: above, 1 tsp hobwaries
      `,
      result: makeResult((i) => ({
        ingredients: [
          i({ type: "snozzberries", amount: 2 }),
          i({ type: "bozzsnerries" }),
          i({ type: "hobwaries", amount: 1, unit: "tsp" }),
        ],
        results: [
          {
            desc: "bifurcate",
            inputs: [
              {
                desc: "simmer",
                inputs: [
                  {
                    desc: "crush",
                    inputs: [i(0)],
                    lineNum: 2,
                  },
                  i(1),
                ],
                lineNum: 3,
              },
              i(2),
            ],
            lineNum: 4,
          },
        ],
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
        results: [
          {
            desc: "bake",
            inputs: [
              {
                desc: "spread",
                inputs: [
                  { desc: "slice in half", inputs: [i(0)], lineNum: 2 },
                  {
                    desc: "mix",
                    inputs: [
                      { desc: "soften", inputs: [i(2)], lineNum: 4 },
                      { desc: "grate", inputs: [i(3)], lineNum: 5 },
                      {
                        desc: "peel and mince",
                        inputs: [{ desc: "roast without peeling", inputs: [i(1)], lineNum: 3 }],
                        lineNum: 6,
                      },
                      i(4),
                      i(5),
                    ],
                    lineNum: 7,
                  },
                ],
                lineNum: 8,
              },
            ],
            lineNum: 9,
          },
        ],
      })),
    },
    {
      desc: "multi-step recipe with errors",
      input: `
      crush @paste: 2 snozzberries
      nonsense
      simmer: , @paste, @nonexistent
      `,
      result: makeResult(
        (i) => ({
          ingredients: [i({ type: "snozzberries", amount: 2 })],
          results: [
            {
              desc: "simmer",
              inputs: [
                {
                  desc: "crush",
                  inputs: [i(0)],
                  resultName: "paste",
                  lineNum: 2,
                },
              ],
              lineNum: 4,
            },
          ],
        }),
        [
          { lineNum: 3, error: expect.stringMatching(/unrecognized/i) },
          { lineNum: 4, error: expect.stringMatching(/empty/i) },
          { lineNum: 4, error: expect.stringMatching(/find.*@nonexistent/i) },
        ],
      ),
    },
    {
      desc: "empty grid recipe",
      input: `
      Manual:

      `,
      result: makeGridResult({
        grid: [[]],
        errors: [],
      }),
    },
    {
      desc: "basic grid recipe",
      input: `
      Manual:

      1 tbsp berry snozz
      4 tsp snozzberries

      fandangle (2)
      `,
      result: makeGridResult({
        grid: [
          [
            { size: 1, lineNum: 4, amount: 1, unit: "tbsp", type: "berry snozz" },
            { size: 1, lineNum: 5, amount: 4, unit: "tsp", type: "snozzberries" },
          ],
          [{ size: 2, lineNum: 7, desc: "fandangle" }],
        ],
        errors: [],
      }),
    },
    {
      desc: "grid recipe with longer second column",
      input: `
      Manual:

      1 tbsp berry snozz
      4 tsp snozzberries

      fandangle (2)
      4 tbsp raspberries
      `,
      result: makeGridResult({
        grid: [
          [
            { size: 1, lineNum: 4, amount: 1, unit: "tbsp", type: "berry snozz" },
            { size: 1, lineNum: 5, amount: 4, unit: "tsp", type: "snozzberries" },
            ,
          ],
          [
            { size: 2, lineNum: 7, desc: "fandangle" },
            ,
            { size: 1, lineNum: 8, amount: 4, unit: "tbsp", type: "raspberries" },
          ],
        ],
        errors: [],
      }),
    },
    {
      desc: "grid recipe with multiple steps per column",
      input: `
      Manual:

      1 tbsp berry snozz
      4 tsp snozzberries
      4 lb normal berries

      fandangle (2)
      blend(1)

      smush (3)
      `,
      result: makeGridResult({
        grid: [
          [
            { size: 1, lineNum: 4, amount: 1, unit: "tbsp", type: "berry snozz" },
            { size: 1, lineNum: 5, amount: 4, unit: "tsp", type: "snozzberries" },
            { size: 1, lineNum: 6, amount: 4, unit: "lb", type: "normal berries" },
          ],
          [{ size: 2, lineNum: 8, desc: "fandangle" }, , { size: 1, lineNum: 9, desc: "blend" }],
          [{ size: 3, lineNum: 11, desc: "smush" }],
        ],
        errors: [],
      }),
    },
  ])("parses $desc correctly", ({ input, result }) => {
    expect(parseRecipe(input)).toEqual(result);
  });
});
