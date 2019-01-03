import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import RecipeDiagram from './Diagram';

import './Editor.css';

const AUTOSAVE_DELAY_MS = 1000;

class RecipeEditor extends Component {
	static propTypes = {
		recipe: PropTypes.shape({
			id: PropTypes.string,
			name: PropTypes.string,
			body: PropTypes.body,
		}),
	};

	constructor(props) {
		super(props);

		this.state = {
			recipeText: '',
		};
	}

	componentDidUpdate(prevProps) {
		if (this.props == prevProps || !this.props.recipe) return;

		const {recipe: { id: prevSelectedRecipeId } = { id: null }} = prevProps;

		if (prevSelectedRecipeId == this.props.recipe.id) {
			if (this.props.recipe.body && this.props.recipe.body != this.state.recipeText) {
				this.setState({ loading: false, recipeText: this.props.recipe.body });
			}
		} else {
			this.setState({ loading: true, recipeText: '' });

			this.props.dispatch({ 
				type: 'DRIVE_DOWNLOAD_REQUESTED',
				fileId: this.props.recipe.id,
			});
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

	saveRecipe(recipeText) {
		try {
			if (this.props.recipe) {
				this.props.dispatch({
					type: 'DRIVE_UPLOAD_REQUESTED', 
					fileId: this.props.recipe.id,
					metadata: {
						name: 'recipe',
					},
					contents: recipeText,
				});
			} else {
				this.props.dispatch({
					type: 'DRIVE_UPLOAD_REQUESTED', 
					metadata: {
						name: 'recipe',
						parents: ['appDataFolder'],
					},
					contents: recipeText,
				});
			}
		} catch (err) {
			console.log('Failed to save recipe:', err);
		} 
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

export default connect()(RecipeEditor);

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
