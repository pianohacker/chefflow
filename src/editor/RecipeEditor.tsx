import { useCallback, useMemo } from "react";
import CodeMirror, { EditorView, gutter, GutterMarker, lineNumbers, StateField } from "@uiw/react-codemirror";
import { styleTags, tags as t } from "@lezer/highlight";
import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language";
import { completeFromList } from "@codemirror/autocomplete";

import sharedClasses from "../shared.module.css";
import classes from "./RecipeEditor.module.css";
import { parser as chefflowParser } from "./chefflow.grammar.ts";
import { canonUnits } from "../units";
import { decodeRecipe } from "../encoding";
import { isIngredient, parseRecipe, Recipe, walkInputs } from "../parser";
import { Diagnostic, linter } from "@codemirror/lint";
import memoize from "memoize";
import QuickLRU from "quick-lru";

const chefflowParserWithMetadata = chefflowParser.configure({
  props: [
    styleTags({
      ResultName: t.variableName,
      Amount: t.number,
      Unit: t.keyword,
    }),
  ],
});

const chefflowLanguage = LRLanguage.define({
  parser: chefflowParserWithMetadata,
});

const unitCompletion = chefflowLanguage.data.of({
  autocomplete: completeFromList(
    canonUnits.map((unit) => ({
      label: unit,
      type: "keyword",
    })),
  ),
});

const chefflowLanguageSupport = new LanguageSupport(chefflowLanguage, [unitCompletion]);

const cmTheme = EditorView.theme({
  "&": {
    fontSize: "1.2rem",
  },
  ".cm-scroller": {
    background: "white",
    fontFamily: "var(--font-family)",
  },
  ".cm-editor.cm-focused": {
    outlineStyle: "none",
  },
  ".cm-gutters": {
    background: "transparent",
  },
  ".cm-lineNumbers": {
    background: "white",
  },
  ".cm-activeLineGutter": {
    background: "transparent",
  },
  ".cm-activeLine, .cm-lineNumbers .cm-activeLineGutter": {
    background: "transparent",
    outline: "1px solid var(--cf-blue)",
  },
  ".cm-lineNumbers .cm-activeLineGutter": {
    color: "#242424",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--cf-blue)",
  },
});

const highlightStyle = HighlightStyle.define([
  {
    tag: t.variableName,
    class: sharedClasses.recipeResultName,
  },
  {
    tag: t.number,
    class: sharedClasses.recipeAmount,
  },
  {
    tag: t.keyword,
    class: sharedClasses.recipeAmount,
  },
]);

class ResultNameMarker extends GutterMarker {
  constructor(public resultName: string) {
    super();
  }

  toDOM(): Node {
    const result = document.createElement("span");
    result.classList.add(sharedClasses.recipeResultName);
    result.innerText = this.resultName;

    return result;
  }
}

class NoValidResultNameMarker extends GutterMarker {
  toDOM(): Node {
    const result = document.createElement("span");
    result.classList.add(sharedClasses.recipeResultName);
    result.classList.add(classes.noValidResultName);
    result.innerText = "@<no options>";

    return result;
  }
}

const memoizedParseRecipe = memoize(parseRecipe, { cache: new QuickLRU({ maxSize: 1000 }) });

const noValidResultName: unique symbol = Symbol("noValidResultName");

type LineNames = Record<number, string | typeof noValidResultName>;

const recipeUpToSelectionState = StateField.define<{
  recipe: Recipe | null;
  lineNames: LineNames;
}>({
  create() {
    return { recipe: { results: [], ingredients: [] }, lineNames: {} };
  },
  update({ recipe: oldRecipe, lineNames: oldLineNames }, { state, newSelection }) {
    const selectionLine = state.doc.lineAt(newSelection.ranges[0].from);

    const result = memoizedParseRecipe(state.sliceDoc(0, selectionLine.from));
    if ("grid" in result) return { recipe: null, lineNames: {} };

    const { recipe } = result;
    if (recipe === oldRecipe) return { recipe: oldRecipe, lineNames: oldLineNames };

    const lineNames: LineNames = {};
    const usedNames = new Set();
    for (const result of Array.from(recipe.results).reverse()) {
      if (result.resultName) {
        lineNames[result.lineNum] = result.resultName;
        continue;
      }

      const resultNames: string[] = [];
      walkInputs([result], (input) => {
        if (isIngredient(input)) {
          for (const word of input.type.trim().split(/\s+/)) {
            if (!usedNames.has(word)) {
              resultNames.push(word);
              usedNames.add(word);
            }
          }
        }

        if (resultNames.length) {
          lineNames[result.lineNum] = resultNames[resultNames.length - 1];
        } else {
          lineNames[result.lineNum] = noValidResultName;
        }
      });
    }

    return { recipe, lineNames };
  },
});

const resultNameGutter = [
  recipeUpToSelectionState,
  gutter({
    lineMarker(view, line) {
      const { lineNames } = view.state.field(recipeUpToSelectionState);

      const { from: selectionFrom, to: selectionTo } = view.state.selection.asSingle().ranges[0];

      if (selectionFrom == selectionTo && selectionFrom <= line.to) return null;

      const { number: lineNum } = view.state.doc.lineAt(line.from);

      const resultName = lineNames[lineNum];

      if (resultName) {
        if (resultName == noValidResultName) {
          return new NoValidResultNameMarker();
        } else {
          return new ResultNameMarker("@" + resultName);
        }
      }

      return null;
    },
    domEventHandlers: {
      mousedown(view, line) {
        const { lineNames } = view.state.field(recipeUpToSelectionState);
        const { number: lineNum } = view.state.doc.lineAt(line.from);

        const resultName = lineNames[lineNum];
        if (!resultName || resultName == noValidResultName) return false;

        const selectionLine = view.state.doc.lineAt(view.state.selection.ranges[0].from);
        const selectionLineContents = selectionLine.text;

        let insert = "@" + resultName;

        if (!selectionLineContents.match(/: \s+$/)) {
          insert = ", " + insert;
        }

        view.dispatch({ changes: [{ from: selectionLine.to, to: selectionLine.to, insert }] });
        return true;
      },
    },
    class: classes.resultNameGutter,
  }),
];

function chefflowLinter(view: EditorView): readonly Diagnostic[] {
  const { doc } = view.state;
  const { errors } = parseRecipe(doc.toString());

  return errors.map(({ lineNum, error }) => {
    const { from, to } = doc.line(lineNum);

    return { severity: "error", from, to, message: error };
  });
}

export function RecipeEditor({
  recipeText,
  setRecipeText,
  setSelectedLineRange,
  playing,
}: {
  recipeText: string;
  setRecipeText: (x: string) => any;
  setSelectedLineRange: (x: [number, number] | null) => any;
  playing: boolean;
}): JSX.Element {
  const onPaste = useCallback(
    (event: React.ClipboardEvent) => {
      const { clipboardData } = event;

      for (const type of ["text/html", "text/plain"]) {
        if (clipboardData.types.includes(type)) {
          const recipeText = decodeRecipe(clipboardData.getData(type));

          if (recipeText) {
            event.preventDefault();
            setRecipeText(recipeText);
            return;
          }
        }
      }
    },
    [setRecipeText],
  );

  const updateSelectedLineRangeListener = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (!update.view.hasFocus) {
          setSelectedLineRange(null);
          return;
        }
        if (!update.selectionSet) return;

        const { state } = update;

        const range = state.selection.ranges[0];
        if (!range) {
          setSelectedLineRange(null);
          return;
        }

        setSelectedLineRange([state.doc.lineAt(range.from).number, state.doc.lineAt(range.to).number]);
      }),
    [setSelectedLineRange],
  );

  return (
    <CodeMirror
      readOnly={playing}
      className={`${classes.recipeEditor} ${playing ? classes.playing : ""}`.trim()}
      value={recipeText}
      basicSetup={{
        lineNumbers: false,
      }}
      extensions={[
        chefflowLanguageSupport,
        syntaxHighlighting(highlightStyle),
        resultNameGutter,
        lineNumbers({
          formatNumber(lineNumber) {
            return `${lineNumber}.`;
          },
        }),
        linter(chefflowLinter, { delay: 100 }),
        EditorView.lineWrapping,
        updateSelectedLineRangeListener,
      ]}
      height="100%"
      theme={cmTheme}
      onPaste={onPaste}
      onChange={(v: string) => setRecipeText(v)}
    />
  );
}
