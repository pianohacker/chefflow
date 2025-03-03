import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { Ingredient, isIngredient, parseRecipe, Recipe, Step } from "../parse";

import sharedClasses from "../shared.module.css";
import classes from "./RecipeDiagram.module.css";
import exportForCopyPaste from "./export-for-copy-paste";
import { encodeRecipe } from "../encoding";

const DENOMINATORS = [2, 3, 4, 6, 8, 16];

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

function placeInGrid(node: Node, grid: Grid, x: number, y: number) {
  let childY = y;
  for (const input of node.children) {
    placeInGrid(input, grid, x - 1, childY);
    childY += input.size;
  }

  grid[x][y] = node;
  for (let fillY = y + 1; fillY < y + node.size; fillY++) grid[x][fillY] = true;
}

function fillGrid(grid: Grid): void {
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

export function RecipeDiagram({
  recipeText,
  playing,
  setPlaying,
}: {
  recipeText: string;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}): JSX.Element {
  const debouncedRecipeText = useDebounce(recipeText, 250);

  const [parsedRecipe, setParsedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const { recipe, errors } = parseRecipe(debouncedRecipeText);

    if (!errors.length) setParsedRecipe(recipe);
  }, [debouncedRecipeText]);

  const recipeGrid = useMemo(() => {
    if (!parsedRecipe || !parsedRecipe.results.length) return [];

    const recipeTrees = parsedRecipe.results.map(makeNode);
    const depth = Math.max(...recipeTrees.map(maxDepth));

    const recipeGrid: Grid = range(depth).map(
      () => new Array(recipeTrees.map(({ size }) => size).reduce((accum, size) => accum + size, 0)),
    );

    let y = 0;

    for (const recipeTree of recipeTrees) {
      placeInGrid(recipeTree, recipeGrid, depth - 1, y);
      y += recipeTree.size;
    }

    fillGrid(recipeGrid);

    return recipeGrid;
  }, [parsedRecipe]);

  const recipeSource = useMemo(() => encodeRecipe(recipeText), [recipeText]);

  const diagramRef = useRef<HTMLTableElement | null>(null);

  const onClickCopy = useCallback(() => {
    if (!diagramRef.current) return;

    diagramRef.current.classList.add(classes.export);
    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([(exportForCopyPaste(diagramRef.current) as HTMLElement).outerHTML], {
          type: "text/html",
        }),
      }),
    ]);
    diagramRef.current.classList.remove(classes.export);
  }, [diagramRef]);

  const onClickPrint = useCallback(() => {
    window.print();
  }, []);

  type NodeStatus = "done" | "active" | "soon" | "later";
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>({});

  const onClickPlay = useCallback(() => {
    if (!recipeGrid[1] || !recipeGrid[1].length) {
      setPlaying(false);
      return;
    }

    if (playing) {
      setNodeStatus({});
      setPlaying(false);
      return;
    }

    const newNodeStatus: typeof nodeStatus = {};

    for (let x = 0; x < 3 && x < recipeGrid.length; x++) {
      for (let y = 0; y < recipeGrid[0].length; y++) {
        const node = recipeGrid[x][y];

        if (isNode(node)) {
          newNodeStatus[[x, y].toString()] = x == 2 ? "soon" : "active";
        }
      }
    }

    setNodeStatus(newNodeStatus);
    setPlaying(true);
  }, [playing, setPlaying, recipeGrid]);

  return (
    <div className={classes.recipeDiagram}>
      <div className={classes.controls}>
        <button className={classes.playButton} onClick={onClickPlay}>
          {playing ? "Stop" : "Play"}
        </button>
      </div>
      <table ref={diagramRef}>
        <tbody>
          {range(recipeGrid[0] ? recipeGrid[0].length : 0).map((y) => (
            <tr key={y}>
              {range(recipeGrid.length).map((x) => {
                const node = recipeGrid[x][y];
                if (!node || !isNode(node)) return null;

                const { input, extent, size } = node;
                let inputNode;
                let className;

                if (isIngredient(input)) {
                  const { amount, unit } = input;
                  let amountDesc = amount?.toString();

                  // Check for evenly divisible fraction
                  if (amount && Math.round(amount) != amount) {
                    for (const den of DENOMINATORS) {
                      const num = amount * den;

                      if (Math.abs(Math.round(num) - num) < 0.001) {
                        amountDesc = `${num}/${den}`;
                        break;
                      }
                    }
                  }

                  inputNode = (
                    <>
                      <span className={sharedClasses.recipeAmount}>
                        {amountDesc}
                        {amountDesc && <>&nbsp;</>}
                        {unit as string}
                        {unit && <>&nbsp;</>}
                      </span>
                      {input.type}
                    </>
                  );
                  className = classes.ingredient;
                } else {
                  inputNode = <>{input.desc}</>;
                  className = classes.step;
                }

                let statusClassName = "";

                if (playing) {
                  const status = nodeStatus[[x, y].toString()] || "later";

                  statusClassName = classes[`inputStatus__${status}`] || "";
                }

                return (
                  <td className={`${className} ${statusClassName}`.trim()} colSpan={extent} rowSpan={size}>
                    {inputNode}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className={classes.recipeSource}>
            <td colSpan={recipeGrid.length}>
              Made with Chefflow:{" "}
              <a href={`${window.location.origin}/#${recipeSource}`}>{`${window.location.origin}/#${recipeSource}`}</a>
            </td>
          </tr>
        </tbody>
      </table>
      <div className={classes.controls}>
        <button className={classes.copyButton} onClick={onClickCopy}>
          Copy Diagram
        </button>
        <button className={classes.printButton} onClick={onClickPrint}>
          Print
        </button>
      </div>
    </div>
  );
}
