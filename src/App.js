import React, { Component } from 'react';

import RecipeEditor from './recipe/Editor';
import RecipeList from './recipe/List';
import './App.css';

import { loadGAPI, driveList, driveAfterSignIn, driveSignIn } from './storage/gapi';

class App extends Component {
	state = {
		gapiState: 'loading',
		loading: true,
		recipes: [],
	};

	componentDidMount() {
		loadGAPI({
			apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
			clientId: process.env.REACT_APP_GOOGLE_API_CLIENT_ID,
		}).then(
			() => {
				this.setState({gapiState: 'loaded'});

				driveAfterSignIn((isSignedIn) => {
					this.setState({isSignedIn});

					this.fetchRecipeList();
				});
			},
			(error) => {
				console.error('Failed to load Google APIs', error);
				this.setState({gapiState: 'failed'})
			}
		);
	}

	onAuthClick = () => {
		driveSignIn();
	}

	async fetchRecipeList() {
		if (!this.state.isSignedIn) return;

		this.setState({ loading: true });

		let recipes = await driveList();

		this.setState({ loading: false, recipes });
	}

	render() {
		const { gapiState, loading, recipes, selectedRecipeId } = this.state;

		let contents;

		switch (gapiState) {
			default:
			case 'loading':
				contents = <div className="RecipeList">
					<header><h1>Loading...</h1></header>
				</div>;
				break;
			case 'failed':
				contents = <div className="RecipeList">
					<header><h1>Failed to load Google APIs</h1></header>
				</div>;
				break;
			case 'loaded':
				contents = <>
					<RecipeList
						loading={loading}
						recipes={recipes}
						onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
						selectedRecipeId={selectedRecipeId}
					/>
					<RecipeEditor
						selectedRecipeId={selectedRecipeId}
						onChangeRecipe={(recipe) => this.setState(({recipes}) => {
								let recipeIndex = recipes.findIndex(({id}) => id == selectedRecipeId);
								console.log(recipeIndex);

								return {
									recipes: [
										...recipes.slice(0, recipeIndex),
										{...recipes[recipeIndex], ...recipe},
										...recipes.slice(recipeIndex + 1),
									]
								};
							})
						}

					/>
				</>;
				break;
		}

		return (
			<div className="App">
				{ contents }
			</div>
		);
	}
}

export default App;
