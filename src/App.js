import React, { Component } from 'react';

import RecipeEditor from './recipe/Editor';
import RecipeList from './recipe/List';
import './App.css';

import { loadGAPI } from './storage/gapi';

class App extends Component {
	state = { gapi: 'loading' };

	componentDidMount() {
		loadGAPI({
			apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
			clientId: process.env.REACT_APP_GOOGLE_API_CLIENT_ID,
		}).then(
			() => {
				this.setState({gapi: 'loaded'});
			},
			(error) => {
				console.error('Failed to load Google APIs', error);
				this.setState({gapi: 'failed'})
			}
		);
	}

	render() {
		const { gapi, selectedRecipeId } = this.state;

		let contents;

		switch (gapi) {
			default:
			case 'loading':
				contents = <header><h1>Loading...</h1></header>;
				break;
			case 'failed':
				contents = <header><h1>Failed to load Google APIs</h1></header>;
				break;
			case 'loaded':
				contents = <>
					<header><h1>Chefflow</h1></header>
					<div>
						<RecipeList
							onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
							selectedRecipeId={selectedRecipeId}
						/>
						<RecipeEditor selectedRecipeId={selectedRecipeId} />
					</div>
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
