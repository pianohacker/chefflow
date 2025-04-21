import { useEffect, useState } from "react";

import appStyles from "./App.module.css";
import { RecipeEditor } from "./editor/RecipeEditor";
import { RecipeDiagram } from "./diagram/RecipeDiagram";
import { decodeRecipe, encodeRecipe } from "./encoding";
import { useDebounce } from "@uidotdev/usehooks";

function App() {
  const [recipeText, setRecipeText] = useState("");
  const [playing, setPlaying] = useState(false);
  const [selectedLineRange, setSelectedLineRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (window.location.hash) {
      const recipe = decodeRecipe(window.location.hash);

      if (recipe) {
        setRecipeText(recipe);
      }
    }
  }, []);

  const debouncedRecipeText = useDebounce(recipeText, 250);
  useEffect(() => {
    const newUrl = new URL(window.location.toString());
    newUrl.hash = encodeRecipe(debouncedRecipeText);

    window.history.replaceState(null, "", newUrl);
  }, [debouncedRecipeText]);

  return (
    <>
      <main>
        <h1 className={appStyles.mainHeader}>Chefflow</h1>
        <RecipeDiagram
          playing={playing}
          setPlaying={setPlaying}
          recipeText={recipeText}
          selectedLineRange={selectedLineRange}
        />
        <RecipeEditor
          playing={playing}
          recipeText={recipeText}
          setRecipeText={setRecipeText}
          setSelectedLineRange={setSelectedLineRange}
        />
      </main>
    </>
  );
}

export default App;
