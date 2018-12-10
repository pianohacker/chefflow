import React, { Component } from 'react';

import RecipeRenderer from './RecipeRenderer';

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
			<RecipeRenderer recipeText={this.state.recipeText} />
		</>;
	}
}
