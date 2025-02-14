import { useCallback } from "react";
import CodeMirror, { EditorView, gutter, GutterMarker } from "@uiw/react-codemirror";
import { styleTags, tags as t } from "@lezer/highlight";
import {
  ensureSyntaxTree,
  HighlightStyle,
  LanguageSupport,
  LRLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { completeFromList } from "@codemirror/autocomplete";

import sharedClasses from "../shared.module.css";
import classes from "./RecipeEditor.module.css";
import { parser as chefflowParser } from "./chefflow.grammar.ts";
import { canonUnits } from "../units";
import { decodeRecipe } from "../encoding";

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
  ".cm-content": {
    fontFamily: "Solway",
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

const resultNameGutter = gutter({
  lineMarker(view, line) {
    const tree = ensureSyntaxTree(view.state, line.to);
    if (!tree) return null;

    let resultName: string | null = null;
    const syntaxStack: string[] = [];
    console.log(chefflowParser.nodeSet.types);
    tree.iterate({
      enter(node) {
        if (resultName) return false;

        switch (node.type.name) {
          case "ResultName":
            if (syntaxStack.includes("Ingredient")) {
              resultName = view.state.sliceDoc(node.from, node.to);
            }
            break;

          case "IngredientType":
            resultName = "@" + view.state.sliceDoc(node.from, node.to);
            break;
        }
        syntaxStack.push(node.type.name);
      },
      leave() {
        syntaxStack.pop();
      },
      from: line.from,
      to: line.to,
    });
    return resultName ? new ResultNameMarker(resultName) : null;
  },
  class: classes.resultNameGutter,
});

export function RecipeEditor({
  recipeText,
  setRecipeText,
}: {
  recipeText: string;
  setRecipeText: (x: string) => any;
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

  return (
    <CodeMirror
      className={classes.recipeEditor}
      value={recipeText}
      basicSetup={{
        lineNumbers: false,
      }}
      extensions={[chefflowLanguageSupport, syntaxHighlighting(highlightStyle), resultNameGutter]}
      height="100%"
      theme={cmTheme}
      onPaste={onPaste}
      onChange={(v: string) => setRecipeText(v)}
    />
  );
}
