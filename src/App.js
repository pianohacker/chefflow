import React, { Component } from 'react';
import { connect } from 'react-redux';

import RecipeEditor from './recipe/Editor';
import RecipeList from './recipe/List';
import './App.css';

class App extends Component {
	state = {};

	onAuthClick = () => {
		this.props.dispatch({type: 'GAPI_SIGN_IN_REQUESTED'});
	}

	onNewRecipe = e => {
		e.preventDefault();

		this.props.dispatch({type: 'DRIVE_NEW_REQUESTED'});
	}

	render() {
		const { gapi } = this.props;
		const { selectedRecipeId } = this.state;

		let contents;

		if (gapi.loading) {
			contents = <div className="App-sidebar">
				<header><h1>Loading...</h1></header>
			</div>;
		} else {
			contents = <>
				<div className="App-sidebar">
					<header><h1>Chefflow</h1></header>
					<RecipeList
						onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
						selectedRecipeId={selectedRecipeId}
					/>
					<footer>
						{ gapi.signedIn && 
							<button onClick={this.onNewRecipe}><i className="fas fa-plus" /> New Recipe</button>
						}
						{ !gapi.signedIn && 
							<button onClick={this.onAuthClick}><i className="fab fa-google-drive" /> Sign in to Google</button>
						}
					</footer>
				</div>
				{
					selectedRecipeId != null &&
					<RecipeEditor
						selectedRecipeId={selectedRecipeId}
					/>
				}
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
