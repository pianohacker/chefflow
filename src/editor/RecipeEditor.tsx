import { useCallback } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { styleTags, tags as t } from "@lezer/highlight";
import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language";
import { completeFromList } from "@codemirror/autocomplete";

import sharedClasses from "../shared.module.css";
import classes from "./RecipeEditor.module.css";
import { parser as chefflowParser } from "./chefflow.grammar.ts";
import { canonUnits } from "../units";

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
          const cfDataMatch = /CF(\d+)_([a-zA-Z0-9+\x2f]+)/.exec(clipboardData.getData(type));
          const [, version, data] = cfDataMatch || [];

          if (cfDataMatch) {
            event.preventDefault();
            if (parseInt(version) == 1) {
              setRecipeText(atob(data));
            }
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
      extensions={[chefflowLanguageSupport, syntaxHighlighting(highlightStyle)]}
      height="100%"
      theme={cmTheme}
      onPaste={onPaste}
      onChange={(v: string) => setRecipeText(v)}
    />
  );
}
