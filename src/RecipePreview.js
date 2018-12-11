import React, { Component } from 'react';

import RecipeDiagram from './RecipeDiagram';

export default class RecipePreview extends Component {
	constructor(props) {
		super(props);

		this.state = {
			recipeText: window.localStorage['recipe'] || '',
		};
	}

	onRecipeTextChanged = e => {
		let recipeText = e.target.value;
		this.setState({recipeText});

		setTimeout(1, () => {
			window.localStorage['recipe'] = recipeText;
		});
	}

	render() {
		return <>
			<textarea onChange={this.onRecipeTextChanged} value={this.state.recipeText} />
			<RecipeDiagram recipeText={this.state.recipeText} />
		</>;
	}
}
