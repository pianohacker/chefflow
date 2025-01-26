import { useCallback } from "react";
import classes from "./RecipeEditor.module.css";

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
          const cfDataMatch = /CF(\d+)_([a-zA-Z0-9+/]+)/.exec(clipboardData.getData(type));
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
    <textarea
      className={classes.recipeEditor}
      value={recipeText}
      onPaste={onPaste}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecipeText(e.target.value)}
    />
  );
}
