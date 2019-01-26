import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import RecipeDiagram from './Diagram';

const StyledRecipeEditor = styled.div`
	display: flex;
	flex: 1 0 0px;
	flex-direction: column;
	margin: 3rem;
`;

const NameEntry = styled.input`
	font: inherit;
	font-size: 1.5rem;
	margin: 0 auto;
	margin-bottom: 1rem;
	width: 30rem;
`;

const Textarea = styled.textarea`
	flex: 1 0 0px;
	font-family: inherit;
	width: 30em;
	margin: 0 auto;
	padding: .5em;
`;

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

		return <StyledRecipeEditor>
			<NameEntry
				onChange={this.onRecipeNameChanged}
				value={name}
				/>
			<Textarea
				onChange={this.onRecipeBodyChanged}
				value={body || ''}
				/>
			<RecipeDiagram recipeText={body} />
		</StyledRecipeEditor>;
	}
}

export default connect(({ recipes }, { selectedRecipeId }) => ({
	recipe: recipes.find(recipe => recipe.id == selectedRecipeId),
}))(RecipeEditor);
