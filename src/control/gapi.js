import moment from 'moment';
import {
	buffers,
	eventChannel,
} from 'redux-saga';
import {
	all,
	call,
	debounce,
	fork,
	put,
	take,
	takeEvery,
} from 'redux-saga/effects';
import multipart from '@request/multipart';

export let gapi = {};

const _API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const _CALLBACK_NAME = '__googleApiOnLoadCallback';
const _CLIENT_ID = process.env.REACT_APP_GOOGLE_API_CLIENT_ID;
const _CLIENT_URL = `https://apis.google.com/js/client.js?onload=${_CALLBACK_NAME}`;
const _DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const _SCOPES = [
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.file',
];

const _AUTOSAVE_DELAY_MS = 1000;
const _FILE_FIELDS = 'files(id, modifiedTime, name)';

function putAction(type, payload) {
	return put({ type, payload });
}

export default function* rootSaga() {
	yield call(loadGAPI);

	yield call(gapi.client.init, {
		apiKey: _API_KEY,
		clientId: _CLIENT_ID,
		discoveryDocs: _DISCOVERY_DOCS,
		scope: _SCOPES.join(' '),
	});

	yield putAction('GAPI_LOADED');

	yield fork(gapiSignInSaga);
	yield fork(gapiDriveSaga);

	const signedInChan = gapiSignedInChannel();
	while (true) {
		const isSignedIn = yield take(signedInChan);

		yield put({type: isSignedIn ? 'GAPI_SIGNED_IN' : 'GAPI_SIGNED_OUT'});
	}
}

// Based on https://github.com/BespokeView/Load-Google-API/blob/master/src/index.js
function loadGAPI() {
	return new Promise((resolve, reject) => {
		const clientScriptElement = document.createElement('script');

		clientScriptElement.src = _CLIENT_URL;
		window[_CALLBACK_NAME] = () => {
			Object.setPrototypeOf(gapi, window.gapi);
			resolve();
		};
		document.body.appendChild(clientScriptElement);
	}).then(() => {
		new Promise((resolve, reject) => {
			gapi.load('client:auth2', {
				callback: resolve,
				onerror: reject,
			});
		});
	});
}

function* gapiSignInSaga() {
	while (true) {
		yield take('GAPI_SIGN_IN_REQUESTED');
		yield call(gapi.auth2.getAuthInstance().signIn);
	}
}

function gapiSignedInChannel() {
	return eventChannel(emitter => {
		const authInstance = gapi.auth2.getAuthInstance();

		if (authInstance.isSignedIn.get()) emitter(true);

		authInstance.isSignedIn.listen((isSignedIn) => {
			emitter(isSignedIn);
		});

		return () => {};
	}, buffers.sliding(2));
}

function* gapiDriveSaga() {
	yield take('GAPI_SIGNED_IN');

	yield putAction('DRIVE_FILES_FETCHING');
	let files = yield call(driveList);
	yield putAction('DRIVE_FILES_FETCHED', { files });

	yield all([
		takeEvery('DRIVE_DOWNLOAD_REQUESTED', driveDownloadSaga),
		debounce(_AUTOSAVE_DELAY_MS, 'DRIVE_UPLOAD_REQUESTED', driveUploadSaga),
		takeEvery('DRIVE_NEW_REQUESTED', driveNewSaga),
	]);
}

async function driveList() {
	let { result } = await gapi.client.drive.files.list({
		spaces: 'appDataFolder',
		fields: _FILE_FIELDS,
		pageSize: 100,
	});

	return (result.files || []).map(file => {
		file.modifiedTime = moment.utc(file.modifiedTime).local();

		return file;
	});
}

function* driveDownloadSaga({ payload: { fileId } }) {
	let { body } = yield call(gapi.client.drive.files.get, {
		fileId,
		alt: 'media',
	});

	yield putAction('DRIVE_DOWNLOAD_FINISHED', { fileId, body });
}

function* driveNewSaga() {
	yield call(driveUploadSaga,
		{
			payload: {
				metadata: {
					parents: ['appDataFolder'],
				},
			},
		},
		{
			started: 'DRIVE_NEW_STARTED',
			finished: 'DRIVE_NEW_FINISHED',
		},
	)
}

function* driveUploadSaga(
	{
		payload: { fileId, metadata, contents },
	},
	{
		started,
		finished,
	} = {
		started: 'DRIVE_UPLOAD_STARTED',
		finished: 'DRIVE_UPLOAD_FINISHED',
	},
) {
	yield putAction(started, { fileId, metadata });

	let { body, contentType } = multipart({
		multipart: [
			{
				'Content-Type': 'application/json; charset=UTF-8',
				body: JSON.stringify(metadata),
			},
			{
				'Content-Type': 'text/plain',
				'Content-Transfer-Encoding': 'base64',
				body: btoa(contents),
			}
		]
	});

	let multipartRequestBody = '';

	yield call(() => new Promise(resolve => {
		body.on('data', data => multipartRequestBody += new TextDecoder('utf-8').decode(data));
		body.on('end', resolve);
	}));

	let { result } = yield call(gapi.client.request, {
		'path': '/upload/drive/v3/files' + (fileId ? `/${fileId}` : ''),
		'method': fileId ? 'PATCH' : 'POST',
		'params': {'uploadType': 'multipart'},
		'headers': {
			'Content-Type': contentType,
		},
		'body': multipartRequestBody
	});

	yield putAction(finished, { fileId, metadata, result });
}
