import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import './List.css';

class RecipeList extends Component {
	static propTypes = {
		recipes: PropTypes.arrayOf(PropTypes.shape({
			id: PropTypes.string,
			name: PropTypes.string,
		})),
		selectedRecipeId: PropTypes.string,
		onSelectRecipe: PropTypes.func.isRequired,
	};

	onSelectRecipe(e, {id}) {
		e.preventDefault();

		this.props.onSelectRecipe({id});
	}

	onNewRecipe = e => {
		e.preventDefault();

		this.props.dispatch({type: 'DRIVE_NEW_REQUESTED'});
	}

	render() {
		const { loading, recipes, selectedRecipeId } = this.props;

		return <div className="RecipeList">
			<header><h1>Chefflow</h1></header>
			{!loading && <ul>
				{recipes.map(recipe => <li key={recipe.id}>
					<a href="#" onClick={e => this.onSelectRecipe(e, recipe)}>
						<span className="RecipeList-name">{recipe.name || 'Untitled'}</span>
						{ recipe.id == selectedRecipeId && <p>
							{!recipe.saving && !recipe.savedAt && `Last changed ${removeFirstCapital(recipe.modifiedTime.calendar())}`}
							{recipe.saving && 'Saving...'}
							{!recipe.saving && recipe.savedAt && `Saved ${removeFirstCapital(recipe.savedAt.calendar())}`}
						</p> }
					</a>
				</li>)}
			</ul>}
			<p>
				{loading && 'Loading...'}
			</p>
			<footer>
				<button onClick={this.onNewRecipe}><i className="fas fa-plus" /> New Recipe</button>
			</footer>
		</div>;
	}
}

export default connect(({ recipes }) => ({ recipes }))(RecipeList);

function removeFirstCapital(string) {
	return string[0].toLowerCase() + string.slice(1);
}
