import { useState } from "react";

import appStyles from "./App.module.css";
import { RecipeEditor } from "./RecipeEditor";
import { RecipePreview } from "./RecipePreview";

function App() {
  const [recipeText, setRecipeText] = useState("");

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
