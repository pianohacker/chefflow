import PropTypes from 'prop-types';
import React, { Component } from 'react';

import './List.css';

export default class RecipeList extends Component {
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

	render() {
		const { loading, recipes, selectedRecipeId } = this.props;

		return <div className="RecipeList">
			<header><h1>Chefflow</h1></header>
			{!loading && <ul>
				{recipes.map(recipe => <li key={recipe.id}>
					<a href="#" onClick={e => this.onSelectRecipe(e, recipe)}>
						<span className="RecipeList-name">{recipe.name}</span>
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
		</div>;
	}
}

function removeFirstCapital(string) {
	return string[0].toLowerCase() + string.slice(1);
}
