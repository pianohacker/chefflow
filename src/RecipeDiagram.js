import React from 'react';
import * as parser from './chefflow-parser';

import './RecipeDiagram.css';

export default class RecipeDiagram extends React.PureComponent {
	render() {
		let recipeNodes = parser.parseRecipe(this.props.recipeText);

		let [laidOutRecipeNodes, width, height] = layoutRecipeNodes(recipeNodes);

		return <RecipeTable width={width} height={height} laidOutRecipeNodes={laidOutRecipeNodes} />
	}
}

class RecipeTable extends React.Component {
	render() {
		let { width, height, laidOutRecipeNodes } = this.props;

		let grid = range(width).map(() => Array(height));

		for (let laidOutNode of laidOutRecipeNodes) {
			grid[laidOutNode.x][laidOutNode.y] = laidOutNode;
		}

		return <table className="RecipeTable">
			<tbody>
				{range(height).map(y =>
					<tr key={y}>
						{range(width).map(x => {
							let node;
							if (!(node = grid[x][y])) return null;

							return <td
									key={x}
									colSpan={1}
									rowSpan={node.height}
								>
								{node.text || node.ingredient}
							</td>;
						})}
					</tr>
				)}
			</tbody>
		</table>;
	}
}

function range(start, stop) {
	if (stop == null) {
		stop = start;
		start = 0;
	}

	return [...Array(stop - start).keys()].map(x => x + start);
}

function layoutRecipeNodes(recipeNodes, startY = 0) {
	let maxWidth = 0;
	let y = startY;
	let laidOutNodes = [];

	for (let node of recipeNodes) {
		let x = 0;
		let startY = y;

		if (node.inputs) {
			let [laidOutInputs, inputsRightX, inputsBottomY] = layoutRecipeNodes(node.inputs, y);

			x = inputsRightX;
			y = inputsBottomY;
			laidOutNodes.push(...laidOutInputs);
		} else {
			y++;
		}

		laidOutNodes.push({
			x,
			y: startY,
			height: y - startY,
			text: node.text,
			ingredient: node.ingredient,
		});

		if (x >= maxWidth) maxWidth = x + 1;
	}

	return [laidOutNodes, maxWidth, y];
}
