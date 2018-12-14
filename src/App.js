import React, { Component } from 'react';

import RecipePreview from './recipe/Preview';
import './App.css';

class App extends Component {
	render() {
		return (
			<div className="App">
				<header><h1>Chefflow</h1></header>
				<RecipePreview />
			</div>
		);
	}
}

export default App;
