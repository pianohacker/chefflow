import { useCallback } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import classes from "./RecipeEditor.module.css";

const cmTheme = EditorView.theme({
  "&": {
    fontSize: "1.2rem",
  },
  ".cm-content": {
    fontFamily: "Atkinson Hyperlegible",
  },
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
      height="100%"
      theme={cmTheme}
      onPaste={onPaste}
      onChange={(v: string) => setRecipeText(v)}
    />
  );
}
