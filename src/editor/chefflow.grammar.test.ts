import { describe, test } from "vitest";
import { parser } from "./chefflow.grammar.ts";
import { testTree } from "@lezer/generator/test";

describe("lezer grammar", () => {
  test.each<{ desc: string; input: string; result: string }>([
    {
      desc: "empty recipe",
      input: "",
      result: `Recipe()`,
    },
    {
      desc: "one-ingredient one-step recipe",
      input: "sautee: 5 onions",
      result: `Recipe(
        Step(StepDesc, Ingredient(Amount, IngredientType))
      )`,
    },
    {
      desc: "one-ingredient with units one-step recipe",
      input: "sautee: 5 pounds onions",
      result: `Recipe(
        Step(
          StepDesc,
          Ingredient(Amount, Unit, IngredientType)
        )
      )`,
    },
    {
      desc: "multi-ingredient one-step recipe",
      input: "sautee: 5 onions, 3 kg radishes",
      result: `Recipe(
        Step(
          StepDesc,
          Ingredient(Amount, IngredientType),
          Ingredient(Amount, Unit, IngredientType),
        )
      )`,
    },
    {
      desc: "multi-step recipe with shortcut backreference names",
      input: `
      crush: 2 snozzberries
      simmer: ^, bozzsnerries
      bifurcate: above, 1 tsp hobwaries
      `,
      result: `Recipe(
        Step(
          StepDesc,
          Ingredient(Amount, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(LastResult)),
          Ingredient(IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(LastResult)),
          Ingredient(Amount, Unit, IngredientType),
        ),
      )`,
    },
    {
      desc: "multi-step recipe with custom backreference names",
      input: `
      crush @paste: 2 snozzberries
      simmer: @paste
      `,
      result: `Recipe(
        Step(
          StepDesc,
          ResultName,
          Ingredient(Amount, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(ResultName)),
        ),
      )`,
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
      mix: @butter, @Parmesan, @garlic, 1 tsp salt, 1 tsp black pepper
      spread: @bread, @butter
      bake: @bread
      `,
      result: `Recipe(
        Step(
          StepDesc,
          Ingredient(Amount, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(Amount, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(Amount, Unit, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(Amount, Unit, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(ResultName)), 
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(ResultName)), 
          Ingredient(BackReference(ResultName)), 
          Ingredient(BackReference(ResultName)), 
          Ingredient(Amount, Unit, IngredientType),
          Ingredient(Amount, Unit, IngredientType),
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(ResultName)), 
          Ingredient(BackReference(ResultName)), 
        ),
        Step(
          StepDesc,
          Ingredient(BackReference(ResultName)), 
        ),
      )`,
    },
  ])("parses $desc correctly", ({ input, result }) => {
    const tree = parser.parse(input);

    if (process.env.TEST_TREE_DEBUG === "true") {
      let indent = 0;
      tree.iterate({
        enter(node) {
          console.debug("  ".repeat(indent), node.name, `[${node.from}-${node.to}]`);
          indent++;
          if (!node.node.firstChild) {
            console.debug("  ".repeat(indent), `"${input.substring(node.from, node.to)}"`);
          }
        },
        leave() {
          indent--;
        },
      });
    }

    testTree(tree, result);
  });
});
