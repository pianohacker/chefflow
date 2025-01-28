import { useCallback, useMemo, useRef } from "react";
import { Ingredient, isIngredient, parseRecipe, Step } from "./parse";
import classes from "./RecipePreview.module.css";
import makeCssInline from "./make-css-inline";

function range(start: number, stop?: number, step: number = 1) {
  if (stop == null) {
    stop = start;
    start = 0;
  }

  return [...Array(stop - start).keys()].map((i) => start + i * step);
}

interface Node {
  size: number;
  extent: number;
  input: Ingredient | Step;
  children: Node[];
}
function isNode(n: any): n is Node {
  return typeof n === "object" && "size" in n && "extent" in n;
}

function makeNode(input: Ingredient | Step): Node {
  if (isIngredient(input)) {
    return { size: 1, input: input, children: [], extent: 1 };
  } else {
    const children = input.inputs.map((input) => makeNode(input));
    const size = children.reduce((accum, input) => accum + input.size, 0);
    return { size: size, input, children, extent: 1 };
  }
}

function maxDepth(node: Node): number {
  return node.children.reduce((accum, input) => Math.max(accum, maxDepth(input) + 1), 1);
}

type Grid = (Node | boolean | null)[][];

function placeInGrid(node: Node, grid: Grid, y: number): number {
  let x;

  if (node.children.length == 0) {
    x = 0;
  } else {
    x = 1;

    let childY = y;
    for (const input of node.children) {
      x = Math.max(x, placeInGrid(input, grid, childY) + 1);
      childY += input.size;
    }
  }

  grid[x][y] = node;
  for (let fillY = y + 1; fillY < y + node.size; fillY++) grid[x][fillY] = true;

  return x;
}

function fillGrid(grid: Grid): void {
  for (let y = 0; y < grid[0].length; y++) {
    let emptySlots = 0;
    for (let x = grid.length - 1; x >= 0; x--) {
      const node = grid[x][y];

      if (node) {
        if (isNode(node)) node.extent += emptySlots;
        emptySlots = 0;
      } else {
        emptySlots++;
      }
    }
  }
}

export function RecipePreview({ recipeText }: { recipeText: string }): JSX.Element {
  const { recipeGrid, errors } = useMemo(() => {
    const { recipe, errors } = parseRecipe(recipeText);

    const recipeTree = makeNode(recipe.stepTree);
    const depth = maxDepth(recipeTree);

    const recipeGrid: Grid = range(depth).map(() => new Array(recipeTree.size));

    placeInGrid(recipeTree, recipeGrid, 0);

    fillGrid(recipeGrid);

    return { recipeGrid, errors };
  }, [recipeText]);

  const recipeSource = useMemo(() => `CF1_${btoa(recipeText)}`, [recipeText]);

  const diagramRef = useRef<HTMLTableElement | null>(null);

  const onClickCopy = useCallback(() => {
    if (!diagramRef.current) return;

    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([(makeCssInline(diagramRef.current) as HTMLElement).outerHTML], { type: "text/html" }),
      }),
    ]);
  }, [diagramRef]);

  return (
    <div className={classes.recipePreview}>
      <button className={classes.copy} onClick={onClickCopy}>
        Copy Diagram
      </button>
      <table ref={diagramRef}>
        <tbody>
          {range(recipeGrid[0].length).map((y) => (
            <tr key={y}>
              {range(recipeGrid.length).map((x) => {
                const node = recipeGrid[x][y];
                if (!node || !isNode(node)) return null;

                const { input, extent, size } = node;
                let inputNode;
                if (isIngredient(input)) {
                  inputNode = (
                    <>
                      {input.amount} {input.unit} {input.type}
                    </>
                  );
                } else {
                  inputNode = <>{input.desc}</>;
                }

                return (
                  <td colSpan={extent} rowSpan={size}>
                    {inputNode}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className={classes.recipeSource}>
            <td colSpan={recipeGrid.length}>{recipeSource}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
