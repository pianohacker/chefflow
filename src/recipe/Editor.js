import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import RecipeDiagram from './Diagram';

import './Editor.css';

const AUTOSAVE_DELAY_MS = 1000;

class RecipeEditor extends Component {
	static propTypes = {
		selectedRecipeId: PropTypes.string,
		recipe: PropTypes.shape({
			name: PropTypes.string,
			body: PropTypes.body,
		}),
	};

	constructor(props) {
		super(props);

		this.state = {
			recipe: {
				name: '',
				body: '',
			},
		};
	}

	static getDerivedStateFromProps(
		{ selectedRecipeId, recipe, dispatch },
		{ selectedRecipeId: prevSelectedRecipeId, recipe: prevRecipe, loading }
	) {
		if (prevSelectedRecipeId == selectedRecipeId) {
			if (recipe && recipe != prevRecipe) {
				return {
					loading: false,
					recipe,
				};
			}
		} else if (!loading) {
			dispatch({
				type: 'DRIVE_DOWNLOAD_REQUESTED',
				payload: {
					fileId: selectedRecipeId,
				},
			});

			return {
				selectedRecipeId,
				loading: true,
				recipe: {},
			}
		}
	}

	onRecipeNameChanged = e => {
		let recipeName = e.target.value;
		this.setState({recipeName});

		this.recipeAutosave();
	}

	onRecipeTextChanged = e => {
		let recipeText = e.target.value;
		this.setState({recipeText});

		this.recipeAutosave();
	}

	recipeAutosave = debounce(() => {
		const { recipeText, recipeName } = this.state;
		this.saveRecipe({
			recipeText,
			recipeName,
		});
	}, AUTOSAVE_DELAY_MS)

	saveRecipe({recipeName, recipeText}) {
		try {
			if (this.props.recipe) {
				this.props.dispatch({
					type: 'DRIVE_UPLOAD_REQUESTED', 
					payload: {
						fileId: this.props.recipe.id,
						metadata: {
							name: recipeName,
						},
						contents: recipeText,
					},
				});
			} else {
				this.props.dispatch({
					type: 'DRIVE_UPLOAD_REQUESTED', 
					payload: {
						metadata: {
							name: recipeName,
							parents: ['appDataFolder'],
						},
						contents: recipeText,
					},
				});
			}
		} catch (err) {
			console.log('Failed to save recipe:', err);
		} 
	}

	render() {
		const { loading, recipe: { name, body } } = this.state;

		if (loading) {
			return <div className="RecipeEditor">
				<p>Loading...</p>
			</div>;
		}

		return <div className="RecipeEditor">
			<input
				className="RecipeEditor-nameEntry" 
				onChange={this.onRecipeNameChanged}
				value={name}
				/>
			<textarea
				onChange={this.onRecipeTextChanged}
				value={body}
				/>
			<RecipeDiagram recipeText={body} />
		</div>;
	}
}

export default connect(({ recipes }, { selectedRecipeId }) => ({
	recipe: recipes.find(recipe => recipe.id == selectedRecipeId),
}))(RecipeEditor);

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
