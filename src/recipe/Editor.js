import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import RecipeDiagram from './Diagram';

import './Editor.css';

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
			loading: false,
		};
	}

	static getDerivedStateFromProps(
		{ selectedRecipeId, recipe, dispatch },
		{ selectedRecipeId: prevSelectedRecipeId, recipe: prevRecipe, loading }
	) {
		if (prevSelectedRecipeId == selectedRecipeId) {
			if (recipe && !prevRecipe) {
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
				recipe: null,
			}
		}

		return null;
	}

	onRecipeNameChanged = e => {
		let name = e.target.value;
		this.setState(({ recipe }) => ({
			recipe: {
				...recipe,
				name,
			}
		}), this.recipeAutosave)
	}

	onRecipeBodyChanged = e => {
		let body = e.target.value;
		this.setState(({ recipe }) => ({
			recipe: {
				...recipe,
				body,
			}
		}), this.recipeAutosave)
	}

	recipeAutosave = () => {
		const { recipe: { name, body } } = this.state;
		this.saveRecipe({
			name,
			body,
		});
	}

	saveRecipe({name, body}) {
		try {
			this.props.dispatch({
				type: 'DRIVE_UPLOAD_REQUESTED', 
				payload: {
					fileId: this.props.recipe.id,
					metadata: {
						name,
					},
					contents: body,
				},
			});
		} catch (err) {
			console.log('Failed to save recipe:', err);
		}
	}

	render() {
		if (this.state.loading) {
			return <div className="RecipeEditor">
				<p>Loading...</p>
			</div>;
		} else if (!this.state.recipe) {
			return;
		}

		const { recipe: { name, body } } = this.state;

		return <div className="RecipeEditor">
			<input
				className="RecipeEditor-nameEntry" 
				onChange={this.onRecipeNameChanged}
				value={name}
				/>
			<textarea
				onChange={this.onRecipeBodyChanged}
				value={body || ''}
				/>
			<RecipeDiagram recipeText={body} />
		</div>;
	}
}

export default connect(({ recipes }, { selectedRecipeId }) => ({
	recipe: recipes.find(recipe => recipe.id == selectedRecipeId),
}))(RecipeEditor);
