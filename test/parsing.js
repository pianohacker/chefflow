require('mocha');
const { expect } = require('chai');
const debug = require('debug')('tests');

let chefflow = require('../chefflow');

function n(text, ...inputs) {
	if (inputs.length) {
		return {
			text,
			inputs: inputs.map(input => typeof input == 'string' ? n(input) : input)
		};
	} else {
		return {ingredient: text};
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
	it('should return a list', () => {
		let nodes = chefflow.parseRecipe('');

		expect(nodes).to.be.a('array');
	});


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
	].forEach( ([ testDescription, recipeText, ...expected ]) => {
		it(`should parse ${testDescription}`, () => {
			let nodes = chefflow.parseRecipe(recipeText);
			debug("Nodes: %o", nodes);

			stripInternalProperties(nodes);

			expect(nodes).to.deep.equal(expected);
		})
	});
})
