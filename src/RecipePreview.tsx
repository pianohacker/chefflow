import classes from "./RecipePreview.module.css";

export function RecipePreview({ recipeText }: { recipeText: string }): JSX.Element {
  const lines = recipeText.split("\n").filter((line) => !!line);

  return (
    <div className={classes.recipePreview}>
      <table>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td>{line}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
