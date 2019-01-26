const debug = require('debug')('tests');

let parser = require('./parser');

function n(text, ...inputs) {
	if (inputs.length) {
		return new parser.RecipeNode({
			text,
			inputs: inputs.map(input => typeof input == 'string' ? n(input) : input)
		});
	} else {
		return new parser.RecipeNode({ingredient: text});
	}
}

function stripInternalProperties(nodes) {
	for (let node of nodes) {
		for (let prop in node) {
			if (prop.startsWith('_')) {
				delete node[prop];
			}
		}
		if (node.inputs) stripInternalProperties(node.inputs);
	}
}

describe('parseRecipe', () => {
	[
		[ 'a single step', 'Dice: tomatoes', n('Dice', 'tomatoes') ],

		[
			'a single step with multiple ingredients',
			'Dice: tomatoes, onions',
			n('Dice', 'tomatoes', 'onions')
		],

		[
			'ingredients with complex descriptions',
			'Dice: 1 (12-ounce) can tomatoes (whole, roasted), 4 onions',
			n('Dice', '1 (12-ounce) can tomatoes (whole, roasted)', '4 onions')
		],

		[
			'multiple steps',
			`
				Dice: tomatoes
				Dice: onions
			`,
			n('Dice', 'tomatoes'),
			n('Dice', 'onions'),
		],

		[
			'multiple connected steps',
			`
				In a bowl:
				Beat: eggs
				Beat in: sugar
			`,
			n(
				'Beat in',
				n('Beat', 'eggs'),
				'sugar'
			),
		],

		[
			'different sets of steps',
			`
				In a bowl:
				Beat: eggs
				Beat in: sugar

				Separately:
				Chop: onions

				For crust:
				Cut into pieces: butter
				Mix in slowly: flour
			`,
			n(
				'Beat in',
				n('Beat', 'eggs'),
				'sugar'
			),
			n(
				'Chop',
				'onions'
			),
			n(
				'Mix in slowly',
				n('Cut into pieces', 'butter'),
				'flour'
			),
		],

		[
			'connected sets of steps',
			`
				In bowl:
				Beat: eggs

				Meanwhile:
				Grate: cheese
				Mix: into bowl
			`,
			n(
				'Mix',
				n('Beat', 'eggs'),
				n('Grate', 'cheese'),
			),
		],

		[
			'connected sets of steps with partial description',
			`
				In large heatproof bowl:
				Beat: eggs

				In small dish:
				Scatter: peppercorns

				Separately:
				Grate: cheese
				Mix: into bowl
			`,
			n('Scatter', 'peppercorns'),
			n(
				'Mix',
				n('Beat', 'eggs'),
				n('Grate', 'cheese'),
			),
		],

		[
			'context with spaces after',
			`
				In bowl:
				Beat: eggs

				Meanwhile:
				Grate: cheese
				Mix: into bowl `,
			n(
				'Mix',
				n('Beat', 'eggs'),
				n('Grate', 'cheese'),
			),
		],

		[
			'context creation with spaces after',
			`
				In bowl :
				Beat: eggs

				Meanwhile:
				Grate: cheese
				Mix: into bowl
			`,
			n(
				'Mix',
				n('Beat', 'eggs'),
				n('Grate', 'cheese'),
			),
		],

		[
			'multiple combinations',
			`
				In bowl:
				Beat: eggs

				Separately:
				Grind: salt
				Sprinkle: in bowl

				Separately:
				Grind: pepper
				Sprinkle: in bowl
			`,
			n(
				'Sprinkle',
				n(
					'Sprinkle',
					n('Beat', 'eggs'),
					n('Grind', 'salt'),
				),
				n('Grind', 'pepper'),
			),
		],

		[
			'combinations by ingredient',
			`
				In bowl:
				Beat: chicken eggs

				Separately:
				Grind: salt
				Sprinkle: on eggs

				In bowl:
				Sift: flour (all-purpose)

				Separately:
				Measure: sugar
				Stir: into flour
			`,
			n(
				'Sprinkle',
				n('Beat', 'chicken eggs'),
				n('Grind', 'salt'),
			),
			n(
				'Stir',
				n('Sift', 'flour (all-purpose)'),
				n('Measure', 'sugar'),
			),
		],
	].forEach( ([ testDescription, recipeText, ...expected ]) => {
		it(`should parse ${testDescription}`, () => {
			let nodes = parser.parseRecipe(recipeText);
			debug("RecipeNodes: %o", nodes);

			stripInternalProperties(nodes);

			expect(nodes).toMatchObject(expected);
		})
	});
})
