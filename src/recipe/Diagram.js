import React from 'react';
import styled from 'styled-components';

import * as parser from './parser';
import braceImage from '../assets/brace.svg';

const StyledRecipeDiagram = styled.table`
	background: white;
	border-collapse: collapse;
	border: thin solid #ccc;
	margin: 2em auto 0;
`;

const RecipeCell = styled.td`
	background-size: 100% 100%;
	border-bottom: thin dotted #ccc;
	font-weight: normal;
	text-align: left;
	padding: .6em 1.75em .6em .5em;
	position: relative;

	&[rowspan]:not([rowspan="1"]):before {
		background-image: url(${braceImage});
		background-size: 100% 100%;
		content: ' ';
		height: calc(100% - 1px);
		left: -1.5em;
		position: absolute;
		top: 1px;
		width: 1.5em;
	}
`;

const RecipeIngredient = styled(RecipeCell)`
	padding-left: 1.25em;
`;

const RecipeError = styled(RecipeCell)`
	color: #800;
`;

export default class RecipeDiagram extends React.PureComponent {
	render() {
		let recipeNodes = parser.parseRecipe(this.props.recipeText);
		window.recipeNodes = recipeNodes;

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

		return <StyledRecipeDiagram>
			<tbody>
				{range(height).map(y =>
					<tr key={y}>
						{range(width).map(x => {
							let node;
							if (!(node = grid[x][y]) || node === true) return null;

							let Component;

							if (node.ingredient) {
								Component = RecipeCell;
							} else if (node.error) {
								Component = RecipeError;
							} else {
								Component = RecipeIngredient;
							}

							return <Component
									key={x}
									colSpan={node.width}
									rowSpan={node.height}
								>
								{node.text || node.ingredient || node.error}
							</Component>;
						})}
					</tr>
				)}
			</tbody>
		</StyledRecipeDiagram>;
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
			error: node.error,
		});

		if (x >= maxWidth) maxWidth = x + 1;
	}

	return [laidOutNodes, maxWidth, y];
}
