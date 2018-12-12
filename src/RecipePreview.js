import React, { Component } from 'react';

import TextareaAutosize from 'react-autosize-textarea';
import RecipeDiagram from './RecipeDiagram';

import './RecipePreview.css';

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
			<TextareaAutosize
				onChange={this.onRecipeTextChanged}
				value={this.state.recipeText}
				maxRows={10}
				/>
			<RecipeDiagram recipeText={this.state.recipeText} />
		</div>;
	}
}
