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
		const { gapi } = this.props;
		const { selectedRecipeId } = this.state;

		let contents;

		if (gapi.loading) {
			contents = <div className="RecipeList">
				<header><h1>Loading...</h1></header>
			</div>;
		} else {
			contents = <>
				<RecipeList
					onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
					selectedRecipeId={selectedRecipeId}
				/>
				<RecipeEditor
					selectedRecipeId={selectedRecipeId}
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
	({ gapi }) => ({ gapi }),
)(App);
