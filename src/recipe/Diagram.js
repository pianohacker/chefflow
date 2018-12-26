import React from 'react';
import * as parser from './parser';

import './Diagram.css';

export default class RecipeDiagram extends React.PureComponent {
	render() {
		let recipeNodes = parser.parseRecipe(this.props.recipeText);

		let [laidOutRecipeNodes, width, height] = layoutRecipeNodes(recipeNodes);

		return <RecipeDiagramTable width={width} height={height} laidOutRecipeNodes={laidOutRecipeNodes} />
	}
}

class RecipeDiagramTable extends React.Component {
	render() {
		let { width, height, laidOutRecipeNodes } = this.props;

		let grid = range(width).map(() => Array(height));

		for (let laidOutNode of laidOutRecipeNodes) {
			grid[laidOutNode.x][laidOutNode.y] = laidOutNode;

			for (let fillY of range(laidOutNode.y + 1, laidOutNode.y + laidOutNode.height)) {
				grid[laidOutNode.x][fillY] = grid[laidOutNode.x][fillY] || true;
			}
		}

		for (let laidOutNode of laidOutRecipeNodes) {
			let nodeWidth = 1;
			for (let testX of range(laidOutNode.x + 1, width)) {
				if (grid[testX][laidOutNode.y]) break;
				nodeWidth++;
			}

			laidOutNode.width = nodeWidth;
		}

		return <table className="RecipeDiagram">
			<tbody>
				{range(height).map(y =>
					<tr key={y}>
						{range(width).map(x => {
							let node;
							if (!(node = grid[x][y]) || node === true) return null;

							return <td
									key={x}
									colSpan={node.width}
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
			height: (y - startY) || 1,
			text: node.text,
			ingredient: node.ingredient,
		});

		if (x >= maxWidth) maxWidth = x + 1;
	}

	return [laidOutNodes, maxWidth, y];
}
