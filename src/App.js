import React, { Component } from 'react';
import { connect } from 'react-redux';

import RecipeEditor from './recipe/Editor';
import RecipeList from './recipe/List';
import './App.css';

class App extends Component {
	state = {};

	onAuthClick = () => {
		this.props.dispatch('GAPI_SIGN_IN_REQUESTED');
	}

	render() {
		const { gapi, recipes } = this.props;
		const { selectedRecipeId } = this.state;

		let contents;

		if (gapi.loading) {
			contents = <div className="RecipeList">
				<header><h1>Loading...</h1></header>
			</div>;
		} else {
			contents = <>
				<RecipeList
					recipes={recipes}
					onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
					selectedRecipeId={selectedRecipeId}
				/>
				<RecipeEditor
					recipe={recipes.find(recipe => recipe.id == selectedRecipeId)}
				/>
			</>;
		}

		return (
			<div className="App">
				{ contents }
			</div>
		);
	}
}

export default connect(
	({ gapi, recipes }) => ({ gapi, recipes }),
)(App);
