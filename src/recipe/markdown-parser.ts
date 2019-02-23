const debug = require('debug')('parser');

import unified from 'unified';
import remarkParse from 'remark-parse';

export function parseRecipe(recipeText: string) {
	let parseTree = unified().use(remarkParse).parse(recipeText) as RemarkNode;
	let result = visitRoot(parseTree);

	return result;
};

interface RemarkNode {
	type: string;
	value: string;
	children: RemarkNode[];
}

type RecipeNode = {
	error?: string;
	text?: string;
	inputs?: RecipeNode[];
	ingredient?: string;
	_ingredients?: string[];
	_context?: string;
}

interface visitorState {
	stack: RecipeNode[],
	context?: string,
};

function visitRoot(node: RemarkNode): RecipeNode[] {
	let state: visitorState  = {
		stack: [],
	};

	for (let child of node.children) {
		switch (child.type) {
			case 'paragraph':
				visitParagraph(child, state);
			case 'list':
				visitList(child, state);
				break;
		}
	}

	return state.stack;
}

let _separateIndex = 0;

function visitParagraph(node: RemarkNode, state: visitorState) {
	let firstChild = node.children[0];

	if (!firstChild || firstChild.type != 'text') {
		return;
	}

	let text = firstChild.value;
	let match;

	if ((match = /^for\s+(.*)|^(in|on)\s+(.*):\s*$/i.exec(text))) {
		state.context = match[1] || match[3];
	} else if (/^(meanwhile|separately):\s*$/i.test(text)) {
		state.context = 'separate' + _separateIndex++;
	}
}

function visitList(node: RemarkNode, state: visitorState) {
	for (let child of node.children) {
		switch (child.type) {
			case 'listItem':
				visitListItem(child, state);
		}
	}
}

function visitListItem(node: RemarkNode, state: visitorState) {
	let firstChild = node.children[0];

	if (!firstChild || firstChild.type != 'paragraph') {
		return;
	}

	let contextInputs: RecipeNode[] = [];
	let lastStep = state.stack[state.stack.length - 1];
	if (state.context && lastStep && lastStep._context == state.context) {
		contextInputs.push(state.stack.pop() as RecipeNode);
	}

	let { textParts, preInputs, postInputs } = visitListParagraph(firstChild, state);

	let combinedText = textParts
		.map((text: string) => text.replace(/^\s+|\s+$/g, ''))
		.filter((text: string) => !/^\W*$/.test(text))
		.join(' ');

	let inputs = [...preInputs, ...contextInputs, ...postInputs];

	let directIngredients = inputs.map(({ingredient}) => ingredient).filter(x => x != null);
	let indirectIngredientSets = inputs.map(({_ingredients}) => _ingredients).filter(x => x != null);
	let _ingredients = Array.prototype.concat.apply(
		directIngredients,
		indirectIngredientSets,
	);

	state.stack.push({
		text: combinedText,
		inputs,
		_context: state.context,
		_ingredients,
	});
}

function visitListParagraph(node: RemarkNode, state: visitorState): { textParts: string[], preInputs: RecipeNode[], postInputs: RecipeNode[] } {
	let textParts: string[] = [];
	let preInputs: RecipeNode[] = [];
	let postInputs: RecipeNode[] = [];

	for (let child of node.children) {
		switch (child.type) {
			case 'text':
				textParts.push(child.value);
				break;
			case 'emphasis':
				let text = child.children[0].value;
				let match;

				if ((match = /^(in(to)?|on)\s+(.+)/.exec(text))) {
					let contextInput = popMatchingStep(state, match[3]);

					preInputs.push(contextInput);

					if (contextInput._context) {
						state.context = contextInput._context;
					}
				} else {
					postInputs.push({ingredient: text});
				}
		}
	}

	return { textParts, preInputs, postInputs };
}

function popMatchingStep(state: visitorState, description: string): RecipeNode {
	let descriptionParts = description.trim().split(/\s+/);
	let matchingIndex = state.stack.findIndex(({_context, _ingredients = []}) =>
		partsInSet(descriptionParts, _context) ||
		_ingredients.some(ingredient => partsInSet(descriptionParts, ingredient))
	);

	if (matchingIndex == -1) {
		return {error: 'no previous steps related to: ' + description};
	}

	let [matchingStep] = state.stack.splice(matchingIndex, 1);

	return matchingStep;
}

function partsInSet(parts: string[], s?: string) {
	if (!s) return false;

	let stringSet = new Set(s.split(/\s+/));

	return parts.every(part => stringSet.has(part));
}
