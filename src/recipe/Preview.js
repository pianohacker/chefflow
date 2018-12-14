import React, { Component } from 'react';

import RecipeDiagram from './Diagram';

import './Preview.css';

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

		setTimeout(() => {
			window.localStorage['recipe'] = recipeText;
		}, 1);
	}

	render() {
		return <div className="RecipePreview">
			<textarea
				onChange={this.onRecipeTextChanged}
				value={this.state.recipeText}
				/>
			<RecipeDiagram recipeText={this.state.recipeText} />
		</div>;
	}
}
