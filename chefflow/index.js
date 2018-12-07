"use strict";

function parseIngredients(ingredients) {
	return ingredients.split(/,\s+(?![^(]+\))/)
		.map(ingredient => ({ingredient}));
}

function parseStep(state, stepContents) {
	let match;

	if (!(match = /^\s*(\S[^:]+)(?:: (.*))?/i.exec(stepContents))) {
		return;
	}

	let [, instruction, extra] = match;

	if ((match = /^for\s+(.*)|^in\s+(.*)/i.exec(instruction))) {
		state.context = match[1] || match[2];
		return;
	} else if (/^separately$/i.test(instruction)) {
		state.context = null;
		return;
	}

	let inputs = [];

	let lastStep = state.stack[state.stack.length - 1];
	if (state.context && lastStep && lastStep._context == state.context) {
		inputs.push(state.stack.pop());
	}

	if (extra) {
		inputs.push(...parseIngredients(extra));
	}

	state.stack.push({text: instruction, inputs, _context: state.context})
}

module.exports = {
	parseRecipe(recipeText) {
		let state = {
			stack: [],
			context: null,
		};

		for (let line of recipeText.split('\n')) {
			parseStep(state, line);
		}

		return state.stack;
	},
};
