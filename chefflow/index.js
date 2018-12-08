"use strict";

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

function parseStep(state, stepContents) {
	let match;

	if (!(match = /^\s*(\S[^:]+)(?::\s*(.+))?/i.exec(stepContents))) {
		return;
	}

	let [, instruction, extra] = match;

	if (parseNewContext(state, instruction)) return;

	let inputs = [];

	let lastStep = state.stack[state.stack.length - 1];
	if (state.context && lastStep && lastStep._context == state.context) {
		inputs.push(state.stack.pop());
	}

	if ((match = /^in(to)?\s+(.+)/.exec(extra))) {
		let contextInput = popMatchingContext(state.stack, match[2]);

		inputs.unshift(contextInput);
	} else if (extra) {
		inputs.push(...parseIngredients(extra));
	}

	state.stack.push({text: instruction, inputs, _context: state.context})
}

function parseNewContext(state, instruction) {
	let match;

	if ((match = /^for\s+(.*)|^(in|on)\s+(.*)/i.exec(instruction))) {
		state.context = match[1] ? {for_: match[1]} : {on: match[3]};
		return true;
	} else if (/^(meanwhile|separately)$/i.test(instruction)) {
		state.context = {separate: true};
		return true;
	}

	return false;
}

function popMatchingContext(stack, contextDescription) {
	let contextParts = contextDescription.split(/\s+/);
	let matchingIndex = stack.findIndex(({_context: {for_, on}}) =>
		partsInSet(contextParts, for_) || partsInSet(contextParts, on)
	);

	if (matchingIndex == -1) {
		return {error: 'nonexistent context: ' + contextDescription};
	}

	let [matchingStep] = stack.splice(matchingIndex, 1);

	return matchingStep;
}

function partsInSet(parts, string) {
	if (!string) return false;

	debugger;

	let stringSet = new Set(string.split(/\s+/));

	return parts.every(part => stringSet.has(part));
}

function parseIngredients(ingredients) {
	return ingredients.split(/,\s+(?![^(]+\))/)
		.map(ingredient => ({ingredient}));
}
