require('mocha');
let { expect } = require('chai');

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
			'Dice: tomatoes (whole, roasted), onions',
			n('Dice', 'tomatoes (whole, roasted)', 'onions')
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
	].forEach( ([ testDescription, recipeText, ...expected ]) => {
		it(`should parse ${testDescription}`, () => {
			let nodes = chefflow.parseRecipe(recipeText);

			expect(nodes).to.have.lengthOf(expected.length);

			for (let i = 0; i < nodes.length; i++) {
				expect(nodes[i]).to.deep.include(expected[i]);
			}
		})
	});
})
