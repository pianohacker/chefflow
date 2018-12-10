import React, { Component } from 'react';
import * as parser from 'chefflow-parser';

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
			<pre style={{width: "100%"}}>{JSON.stringify(parser.parseRecipe(this.state.recipeText), null, 2)}</pre>
		</>;
	}
}
