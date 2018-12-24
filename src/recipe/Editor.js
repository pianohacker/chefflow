import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';

import RecipeDiagram from './Diagram';
import { gapi, driveDownload, driveList, driveUpload } from '../storage/gapi';

import './Editor.css';

export default class RecipeEditor extends Component {
	static propTypes = {
		selectedRecipeId: PropTypes.string,
	};

	constructor(props) {
		super(props);

		this.state = {
			recipeText: '',
			loading: false,
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

	componentDidUpdate({selectedRecipeId}) {
		if (selectedRecipeId != this.props.selectedRecipeId) {
			this.fetchRecipe();
		}
	}

	onRecipeTextChanged = e => {
		let recipeText = e.target.value;
		this.setState({recipeText});

		setTimeout(() => {
			this.saveRecipe(recipeText);
		}, 1);
	}

	async saveRecipe(recipeText) {
		if (!this.state.isSignedIn || this.state.saving || !this.props.selectedRecipeId) return;

		this.setState({saving: true});
		
		try {
			if (this.props.selectedRecipeId) {
				await driveUpload({
					fileId: this.props.selectedRecipeId,
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
		if (!this.state.isSignedIn || this.state.saving || !this.props.selectedRecipeId) return;

		let recipeText = await driveDownload({ fileId: this.props.selectedRecipeId });

		this.setState({ recipeText, loading: false });
	}

	render() {
		const { isSignedIn, saving, savedAt } = this.state;

		return <div className="RecipeEditor">
			<p>
				{saving && 'Saving...'}
				{!saving && savedAt && `Saved at ${savedAt.format('LT')}`}
			</p>
			<textarea
				onChange={this.onRecipeTextChanged}
				value={this.state.recipeText}
				/>
			<RecipeDiagram recipeText={this.state.recipeText} />
		</div>;
	}
}
