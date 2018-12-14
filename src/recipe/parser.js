export function parseRecipe(recipeText) {
	let state = {
		stack: [],
		context: null,
	};

	for (let line of recipeText.split('\n')) {
		parseStep(state, line);
	}

	return state.stack;
};

export function RecipeNode({text, inputs, ingredient}) {
	if (ingredient) {
		this.ingredient = ingredient;
	} else {
		this.text = text;
		this.inputs = inputs;
	}
}

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

	if ((match = /^(in(to)?|on)\s+(.+)/.exec(extra))) {
		let contextInput = popMatchingStep(state.stack, match[3]);

		inputs.unshift(contextInput);

		if (contextInput._context) {
			state.context = contextInput._context;
		}
	} else if (extra) {
		inputs.push(...parseIngredients(extra));
	}

	let result = new RecipeNode({text: instruction, inputs});
	result._context = state.context;

	let directIngredients = inputs.map(({ingredient}) => ingredient).filter(x => x != null);
	let indirectIngredientSets = inputs.map(({_ingredients}) => _ingredients).filter(x => x != null);
	result._ingredients = Array.prototype.concat.apply(
		directIngredients,
		indirectIngredientSets,
	);

	state.stack.push(result);
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

function popMatchingStep(stack, description) {
	let descriptionParts = description.split(/\s+/);
	let matchingIndex = stack.findIndex(({_context: {for_, on}, _ingredients = []}) =>
		partsInSet(descriptionParts, for_) ||
		partsInSet(descriptionParts, on) ||
		_ingredients.some(ingredient => partsInSet(descriptionParts, ingredient))
	);

	if (matchingIndex == -1) {
		return {error: 'no previous steps related to: ' + description};
	}

	let [matchingStep] = stack.splice(matchingIndex, 1);

	return matchingStep;
}

function partsInSet(parts, string) {
	if (!string) return false;

	let stringSet = new Set(string.split(/\s+/));

	return parts.every(part => stringSet.has(part));
}

function parseIngredients(ingredients) {
	return ingredients.split(/,\s+(?![^(]+\))/)
		.map(ingredient => new RecipeNode({ingredient}));
}
