import React, { Component } from 'react';

import RecipeDiagram from './RecipeDiagram';

export default class RecipePreview extends Component {
	constructor(props) {
		super(props);

		this.state = {
			recipeText: '',
		};
	}

	render() {
		return <>
			<textarea onChange={e => this.setState({recipeText: e.target.value})} />
			<RecipeDiagram recipeText={this.state.recipeText} />
		</>;
	}
}
