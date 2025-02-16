import { useEffect, useState } from "react";

import appStyles from "./App.module.css";
import { RecipeEditor } from "./editor/RecipeEditor";
import { RecipePreview } from "./RecipePreview";
import { decodeRecipe } from "./encoding";

function App() {
  const [recipeText, setRecipeText] = useState("");

  useEffect(() => {
    if (window.location.hash) {
      const recipe = decodeRecipe(window.location.hash);

      if (recipe) {
        setRecipeText(recipe);
      }
    }
  }, []);

  return (
    <>
      <main>
        <h1 className={appStyles.mainHeader}>Chefflow</h1>
        <RecipeEditor recipeText={recipeText} setRecipeText={setRecipeText} />
        <RecipePreview recipeText={recipeText} />
      </main>
    </>
  );
}

export default App;
