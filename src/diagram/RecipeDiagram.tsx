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

function makeGrid(width: number, height: number): any[][] {
  return range(width).map(() => new Array(height));
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
    const totalSize = recipeTrees.map(({ size }) => size).reduce((accum, size) => accum + size, 0);
    const recipeGrid = makeGrid(depth, totalSize) as Grid;

    let y = 0;

    for (const recipeTree of recipeTrees) {
      placeInGrid(recipeTree, recipeGrid, depth - 1, y);
      y += recipeTree.size;
    }

    fillGrid(recipeGrid);

    return recipeGrid;
  }, [parsedRecipe]);

  const diagramRef = useRef<HTMLTableElement | null>(null);

  const onClickCopy = useCallback(() => {
    if (!diagramRef.current) return;

    diagramRef.current.classList.add(classes.export);

    const tr = document.createElement("tr");
    tr.classList.add(classes.recipeSource);
    diagramRef.current.appendChild(tr);

    const td = document.createElement("td");
    td.setAttribute("colspan", recipeGrid.length.toString());
    tr.appendChild(td);

    const recipeSource = encodeRecipe(recipeText);
    const a = document.createElement("a");
    const linkContents = `${window.location.origin}/#${recipeSource}`;
    a.setAttribute("href", linkContents);
    a.innerText = linkContents;
    td.append(document.createTextNode("Made with Chefflow "), a);

    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([(exportForCopyPaste(diagramRef.current) as HTMLElement).outerHTML], {
          type: "text/html",
        }),
      }),
    ]);

    tr.remove();
    diagramRef.current.classList.remove(classes.export);
  }, [diagramRef, recipeText, recipeGrid.length]);

  const onClickPrint = useCallback(() => {
    setPlaying(false);

    setTimeout(() => {
      window.print();
    }, 0);
  }, [setPlaying]);

  type NodeStatus = "done" | "active" | "soon" | "later";
  const [nodeStatus, setNodeStatus] = useState<NodeStatus[][]>([]);

  const onClickPlay = useCallback(() => {
    if (!recipeGrid[1] || !recipeGrid[1].length) {
      setPlaying(false);
      return;
    }

    if (playing) {
      setNodeStatus([]);
      setPlaying(false);
      return;
    }

    const newNodeStatus = makeGrid(recipeGrid.length, recipeGrid[0].length) as typeof nodeStatus;

    for (let x = 0; x < 3 && x < recipeGrid.length; x++) {
      for (let y = 0; y < recipeGrid[0].length; y++) {
        const node = recipeGrid[x][y];

        if (isNode(node)) {
          newNodeStatus[x][y] = x == 2 ? "soon" : "active";
        }
      }
    }

    setNodeStatus(newNodeStatus);
    setPlaying(true);
  }, [playing, setPlaying, recipeGrid]);

  const onClickNode = useCallback(
    (x: number, y: number) => {
      if (!playing) return;

      const node = recipeGrid[x][y];
      if (!isNode(node)) return;

      const newNodeStatus = nodeStatus.map((x) => Array.from(x));

      const status = nodeStatus[x][y] || "later";

      switch (status) {
        case "done":
          {
            newNodeStatus[x][y] = "active";
            // Reactivate forward
            let ay = y;
            for (let ax = x + 1; ax < newNodeStatus.length; ax++) {
              for (; ay >= 0; ay--) {
                if (isNode(recipeGrid[ax][ay])) break;
              }

              const aStatus = newNodeStatus[ax][ay];
              if (aStatus != "done") break;

              newNodeStatus[ax][ay] = "active";
            }
          }
          break;

        case "active":
          {
            newNodeStatus[x][y] = "done";
            // Finish backward
            for (let dx = x - 1; dx >= 0; dx--) {
              for (let dy = y; dy <= y + node.size - 1; dy++) {
                if (isNode(recipeGrid[dx][dy])) {
                  newNodeStatus[dx][dy] = "done";
                }
              }
            }
          }
          break;

        case "soon":
          break;

        case "later":
          break;
      }

      let allActiveX: number | null = null;
      for (let x = 0; x < newNodeStatus.length; x++) {
        let activeCount = 0;
        let totalCount = 0;

        for (let y = 0; y < newNodeStatus[0].length; y++) {
          if (isNode(recipeGrid[x][y])) {
            if (newNodeStatus[x][y] == "active") {
              activeCount++;
            }
            totalCount++;
          }
        }

        if (activeCount && activeCount == totalCount) {
          allActiveX = x;
          break;
        }
      }

      if (allActiveX == null) {
        let firstSoonX: number | null = null;
        for (let x = 0; x < newNodeStatus.length; x++) {
          let foundSoon = false;
          for (let y = 0; y < newNodeStatus[0].length; y++) {
            if (newNodeStatus[x][y] == "soon") {
              foundSoon = true;
              break;
            }
          }

          if (foundSoon) {
            firstSoonX = x;
            break;
          }
        }

        if (firstSoonX != null) {
          for (let y = 0; y < newNodeStatus[0].length; y++) {
            if (newNodeStatus[firstSoonX][y] == "soon") {
              newNodeStatus[firstSoonX][y] = "active";
            }
          }

          if (firstSoonX + 1 < newNodeStatus.length) {
            for (let y = 0; y < newNodeStatus[0].length; y++) {
              newNodeStatus[firstSoonX + 1][y] = "soon";
            }
          }
        }
      }

      setNodeStatus(newNodeStatus);
    },
    [playing, recipeGrid, nodeStatus, setNodeStatus],
  );

  return (
    <div className={`${classes.recipeDiagram} ${playing ? classes.playing : ""}`.trim()}>
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
                  const status = nodeStatus[x][y] || "later";

                  statusClassName = classes[`inputStatus__${status}`] || "";
                }

                return (
                  <td
                    className={`${className} ${statusClassName}`.trim()}
                    colSpan={extent}
                    rowSpan={size}
                    onClick={() => onClickNode(x, y)}
                  >
                    {inputNode}
                  </td>
                );
              })}
            </tr>
          ))}
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
