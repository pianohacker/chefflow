import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import RecipeEditor from './recipe/Editor';
import RecipeList from './recipe/List';

const StyledApp = styled.div`
	display: flex;
	height: 100vh;
	text-align: center;
`;

const Sidebar = styled.div`
	background: rgba(255, 255, 255, 50%);
	border-right: thin solid #ccc;
	display: flex;
	flex: 0 1 20em;
	flex-direction: column;
	padding: 3rem;
	margin-right: 1.5rem;
	text-align: left;
`;

const Title = styled.h1`
	font-size: 2.25em;
	margin: 0;
	margin-bottom: 1.5rem;
`;

const Footer = styled.footer`
	display: flex;
`;

const Button = styled.button`
	border: 2px solid #ccc;
	background-color: white;
	color: black;
	flex: 1 0 0px;
	font: inherit;
	font-size: 1.25rem;
	padding: .5rem 1rem;
	text-align: center;
	text-transform: uppercase;

	&:hover {
		background-color: #f8f8f8;
	}

	& i.fas, & i.fab {
		font-size: 1rem;
		margin-right: .25rem;
		vertical-align: -.05rem;
	}
`;

class App extends Component {
	state = {};

	onAuthClick = () => {
		this.props.dispatch({type: 'GAPI_SIGN_IN_REQUESTED'});
	}

	onNewRecipe = e => {
		e.preventDefault();

		this.props.dispatch({type: 'DRIVE_NEW_REQUESTED'});
	}

	render() {
		const { gapi } = this.props;
		const { selectedRecipeId } = this.state;

		let contents;

		if (gapi.loading) {
			contents = <Sidebar>
				<header><Title>Loading...</Title></header>
			</Sidebar>;
		} else {
			contents = <>
				<Sidebar>
					<header><Title>Chefflow</Title></header>
					<RecipeList
						onSelectRecipe={({id}) => this.setState({selectedRecipeId: id})}
						selectedRecipeId={selectedRecipeId}
					/>
					<Footer>
						{ gapi.signedIn && 
							<Button onClick={this.onNewRecipe}><i className="fas fa-plus" /> New Recipe</Button>
						}
						{ !gapi.signedIn && 
							<Button onClick={this.onAuthClick}><i className="fab fa-google-drive" /> Sign in to Google</Button>
						}
					</Footer>
				</Sidebar>
				{
					selectedRecipeId != null &&
					<RecipeEditor
						selectedRecipeId={selectedRecipeId}
					/>
				}
			</>;
		}

		return (
			<StyledApp>
				{ contents }
			</StyledApp>
		);
	}
}

export default connect(
	({ gapi }) => ({ gapi }),
)(App);
