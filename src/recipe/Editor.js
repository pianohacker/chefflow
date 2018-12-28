import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';

import RecipeDiagram from './Diagram';
import { gapi, driveDownload, driveUpload } from '../storage/gapi';

import './Editor.css';

const AUTOSAVE_DELAY_MS = 1000;

export default class RecipeEditor extends Component {
	static propTypes = {
		selectedRecipeId: PropTypes.string,
		onChangeRecipe: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			recipeText: '',
			loading: false,
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

		this.recipeAutosave(recipeText);
	}

	recipeAutosave = debounce((recipeText) => {
		this.saveRecipe(recipeText);
	}, AUTOSAVE_DELAY_MS)

	async saveRecipe(recipeText) {
		this.props.onChangeRecipe({saving: true});

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

			this.props.onChangeRecipe({saving: false, savedAt: new moment()});
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
		const { recipeText } = this.state;

		return <div className="RecipeEditor">
			<textarea
				onChange={this.onRecipeTextChanged}
				value={recipeText}
				/>
			<RecipeDiagram recipeText={recipeText} />
		</div>;
	}
}

function debounce(func, wait) {
	let timeout;
	return function() {
		let context = this, args = arguments;
		let later = function() {
			timeout = null;
			func.apply(context, args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
};
