import { applyMiddleware, createStore, combineReducers, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';

import gapiSaga from './gapi';

function gapi(state = {loading: true}, {type, payload}) {
	switch (type) {
		case 'GAPI_LOADED':
			return {
				...state,
				loading: false,
			};
		case 'GAPI_SIGNED_IN':
			return {
				...state,
				signedIn: true,
			};
		case 'GAPI_SIGNED_OUT':
			return {
				...state,
				signedIn: true,
			};
		default:
			return state;
	}
}

function recipes(state = [], {type, payload}) {
	switch (type) {
		case 'DRIVE_FILES_FETCHED':
			return payload.files;
		case 'DRIVE_UPLOAD_REQUESTED':
			return extendAtMatch(
				state,
				file => file.id == payload.fileId,
				{ name: payload.metadata.name },
			);
		case 'DRIVE_DOWNLOAD_FINISHED':
			return extendAtMatch(
				state,
				file => file.id == payload.fileId,
				{ body: payload.body },
			);
		default:
			return state;
	}
}

function extendAtMatch(list, predicate, value) {
	let index = list.findIndex(predicate);

	if (index == -1) {
		throw new Error('No match found in state');
	}

	return [
		...list.slice(0, index),
		{...list[index], ...value},
		...list.slice(index + 1),
	];
}

function replaceAtMatchOrEnd(list, predicate, value) {
	let index = list.findIndex(predicate);
	let position = index == -1 ? list.length : 0;

	return list.splice(position, 1, value);
}

const sagaMiddleware = createSagaMiddleware();

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
export default createStore(
	combineReducers({
		gapi,
		recipes,
	}),
	composeEnhancers(
		applyMiddleware(
			sagaMiddleware,
		)
	),
);

sagaMiddleware.run(gapiSaga);
