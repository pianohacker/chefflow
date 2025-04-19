import { Ingredient, isIngredient, isStep, Recipe, Step } from ".";
import { range } from "../utils";

export interface Node {
  size: number;
  extent: number;
  input: Ingredient | Step;
  children: Node[];
}

export function isNode(n: any): n is Node {
  return typeof n === "object" && "size" in n && "extent" in n;
}

export function makeNode(input: Ingredient | Step): Node {
  if (isIngredient(input)) {
    return { size: 1, input: input, children: [], extent: 1 };
  } else {
    const children = input.inputs.map((input) => makeNode(input));
    const size = children.reduce((accum, input) => accum + input.size, 0);
    return { size: size, input, children, extent: 1 };
  }
}

export function maxDepth(node: Node): number {
  return node.children.reduce((accum, input) => Math.max(accum, maxDepth(input) + 1), 1);
}

export type Grid = (Node | boolean | null)[][];

export function placeInGrid(node: Node, grid: Grid, x: number, y: number) {
  let childY = y;
  for (const input of node.children) {
    placeInGrid(input, grid, x - 1, childY);
    childY += input.size;
  }

  grid[x][y] = node;
  for (let fillY = y + 1; fillY < y + node.size; fillY++) grid[x][fillY] = true;
}

export function fillGrid(grid: Grid): void {
  for (let y = 0; y < grid[0].length; y++) {
    let curNode;
    for (let x = grid.length - 1; x >= 0; x--) {
      const node = grid[x][y];

      if (node) {
        curNode = node;
      } else if (curNode && isNode(curNode)) {
        curNode.extent++;
      }
    }
  }
}

export function makeGrid(width: number, height: number): any[][] {
  return range(width).map(() => new Array(height));
}

export function makeGridFromRecipe(recipe: Recipe): Grid {
  const recipeTrees = recipe.results.map(makeNode);

  const depth = Math.max(...recipeTrees.map(maxDepth));
  const totalSize = recipeTrees.map(({ size }) => size).reduce((accum, size) => accum + size, 0);
  const recipeGrid = makeGrid(depth, totalSize) as Grid;

  let y = 0;

  for (const recipeTree of recipeTrees) {
    placeInGrid(recipeTree, recipeGrid, depth - 1, y);
    y += recipeTree.size;
  }

  fillGrid(recipeGrid);

  return recipeGrid;
}

export function exportGrid(grid: Grid): string {
  const result = ["Grid:\n--\n"];
  for (let x = 0; x < grid.length; x++) {
    const length = grid[x].findLastIndex((el) => !!el) + 1;
    for (let y = 0; y < length; y++) {
      const el = grid[x][y];
      if (isNode(el)) {
        if (isStep(el.input)) {
          result.push(`${el.input.desc} (${el.size})`);
        } else if (isIngredient(el.input)) {
          result.push(
            el.input.amount ? `${el.input.amount} ` : "",
            el.input.unit ? `${el.input.unit} ` : "",
            el.input.type,
          );
        }
        result.push("\n");
      } else if (typeof el !== "boolean") {
        result.push("\n");
      }
    }
    result.push("--\n");
  }

  return result.join("").trim();
}
