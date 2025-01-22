import classes from "./RecipeEditor.module.css";

export function RecipeEditor({
  recipeText,
  setRecipeText,
}: {
  recipeText: string;
  setRecipeText: (x: string) => any;
}): JSX.Element {
  return (
    <textarea
      className={classes.recipeEditor}
      value={recipeText}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecipeText(e.target.value)}
    />
  );
}
