"use strict";

function parseStep(stack, stepContents) {
	let match;

	if ((match = /^\s*(\S[^:]+)(?:: (.*))?/i.exec(stepContents))) {
		if (match[2]) {
			let addedIngredients = match[2].split(/,\s+(?![^(]+\))/)
				.map(ingredient => ({ingredient}));

			stack.push({text: match[1], inputs: addedIngredients})
		} else {
		}
	}
}

module.exports = {
	parseRecipe(recipeText) {
		let stack = [];

		for (let line of recipeText.split('\n')) {
			parseStep(stack, line);
		}

		return stack;
	},
};
