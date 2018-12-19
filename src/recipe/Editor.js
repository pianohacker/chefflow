import React, { Component } from 'react';
import moment from 'moment';

import RecipeDiagram from './Diagram';
import { gapi, driveDownload, driveList, driveUpload } from '../storage/gapi';

import './Editor.css';

export default class RecipeEditor extends Component {
	constructor(props) {
		super(props);

		this.state = {
			recipeText: '',
			saving: false,
			savedAt: null,
			isSignedIn: gapi.auth2.getAuthInstance().isSignedIn.get(),
		};
	}

	componentDidMount() {
		gapi.auth2.getAuthInstance().isSignedIn.listen(isSignedIn => {
			this.setState({isSignedIn});

			this.fetchRecipe();
		});

		this.fetchRecipe();
	}

	onRecipeTextChanged = e => {
		let recipeText = e.target.value;
		this.setState({recipeText});

		setTimeout(() => {
			this.saveRecipe(recipeText);
		}, 1);
	}

	onAuthClick = () => {
		gapi.auth2.getAuthInstance().signIn();
	}

	async saveRecipe(recipeText) {
		if (!this.state.isSignedIn || this.state.saving) return;

		this.setState({saving: true});
		
		let files = await driveList();

		let recipeFile = files.find(file => file.name == 'recipe');
		let recipeFileId = recipeFile ? recipeFile.id : null;

		try {
			if (recipeFileId) {
				await driveUpload({
					fileId: recipeFileId,
					metadata: {
						name: 'recipe',
					},
					contents: recipeText,
				});
			} else {
				await driveUpload({
					metadata: {
						name: 'recipe',
						parents: ['appDataFolder'],
					},
					contents: recipeText,
				});
			}

			this.setState({saving: false, savedAt: new moment()});
		} catch (err) {
			console.log('Failed to save recipe:', err);
		} 
	}

	async fetchRecipe() {
		let files = await driveList();

		let recipeFile = files.find(file => file.name == 'recipe');
		let recipeFileId = recipeFile ? recipeFile.id : null;

		let recipeText = await driveDownload({ fileId: recipeFileId });

		this.setState({ recipeText });
	}

	render() {
		const { isSignedIn, saving, savedAt } = this.state;

		return <div className="RecipeEditor">
			<p>
				{saving && 'Saving...'}
				{!saving && savedAt && `Saved at ${savedAt.format('LT')}`}
				{!isSignedIn && <button onClick={this.onAuthClick}>Authorize</button>}
			</p>
			<textarea
				onChange={this.onRecipeTextChanged}
				value={this.state.recipeText}
				/>
			<RecipeDiagram recipeText={this.state.recipeText} />
		</div>;
	}
}
