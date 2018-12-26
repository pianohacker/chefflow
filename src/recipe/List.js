import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';

import { gapi, driveList } from '../storage/gapi';

import './List.css';

export default class RecipeList extends Component {
	static propTypes = {
		selectedRecipeId: PropTypes.string,
		onSelectRecipe: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		this.state = {
			loading: true,
			saving: false,
			isSignedIn: gapi.auth2.getAuthInstance().isSignedIn.get(),
		};
	}

	componentDidMount() {
		gapi.auth2.getAuthInstance().isSignedIn.listen(isSignedIn => {
			this.setState({isSignedIn});

			this.fetchRecipeList();
		});

		this.fetchRecipeList();
	}

	onAuthClick = () => {
		gapi.auth2.getAuthInstance().signIn();
	}

	async fetchRecipeList() {
		if (!this.state.isSignedIn) return;

		this.setState({ loading: true });

		let recipes = await driveList();

		this.setState({ loading: false, recipes });
	}

	onSelectRecipe(e, {id}) {
		e.preventDefault();

		this.props.onSelectRecipe({id});
	}

	render() {
		const { isSignedIn, loading, recipes } = this.state;

		return <div className="RecipeList">
			<header><h1>Chefflow</h1></header>
			{!loading && <ul>
				{recipes.map(recipe => <li key={recipe.id}>
					<a href="#" onClick={e => this.onSelectRecipe(e, recipe)}>{recipe.name}</a>
				</li>)}
			</ul>}
			<p>
				{loading && 'Loading...'}
				{!isSignedIn && <button onClick={this.onAuthClick}>Authorize</button>}
			</p>
		</div>;
	}
}
