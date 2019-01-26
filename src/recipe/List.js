import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

const StyledRecipeList = styled.ul`
	border-top: thin dotted #ccc;
	flex: 1 0 0px;
	margin: .6em;
	margin-left: 0;
	padding: 0;
`;

const RecipeItem = styled.li`
	border-bottom: thin dotted #ccc;
	font-size: 1.5em;
	list-style-type: none;
`;

const RecipeLink = styled.a`
	color: black;
	display: inline-block;
	padding: .6rem;
	text-decoration: none;
	width: 100%;
`;

const RecipeName = styled.span`
	text-decoration: underline;
`;

const RecipeDescription = styled.p`
	color: #444;
	flex: 1 0 0px;
	font-size: 1rem;
	text-decoration: none;
`;

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

	render() {
		const { loading, recipes, selectedRecipeId } = this.props;

		return <StyledRecipeList>
			{loading && <li>Loading</li>}
			{!loading && recipes.map(recipe => <RecipeItem key={recipe.id}>
				<RecipeLink href="#" onClick={e => this.onSelectRecipe(e, recipe)}>
					<RecipeName>{recipe.name || 'Untitled'}</RecipeName>
					{ recipe.id == selectedRecipeId && <RecipeDescription>
						{!recipe.saving && !recipe.savedAt && `Last changed ${removeFirstCapital(recipe.modifiedTime.calendar())}`}
						{recipe.saving && 'Saving...'}
						{!recipe.saving && recipe.savedAt && `Saved ${removeFirstCapital(recipe.savedAt.calendar())}`}
					</RecipeDescription> }
				</RecipeLink>
			</RecipeItem>)}
		</StyledRecipeList>;
	}
}

export default connect(({ recipes }) => ({ recipes }))(RecipeList);

function removeFirstCapital(string) {
	return string[0].toLowerCase() + string.slice(1);
}
