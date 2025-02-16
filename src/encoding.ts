import brotliPromise from "brotli-wasm";

const brotli = await brotliPromise;

export function encodeRecipe(recipeText: string): string {
  const recipeData = new TextEncoder().encode(recipeText);

  return `CF2_${btoa(String.fromCharCode.apply(null, Array.from(brotli.compress(recipeData))))}`;
}

export function decodeRecipe(recipeSource: string): string | null {
  const cfDataMatch = /CF(\d+)_([a-zA-Z0-9+\x2f]+)/.exec(recipeSource);
  const [, version, data] = cfDataMatch || [];

  if (version === "2") {
    return new TextDecoder().decode(
      brotli.decompress(new Uint8Array(Array.from(atob(data)).map((c) => c.charCodeAt(0)))),
    );
  }

  return null;
}
