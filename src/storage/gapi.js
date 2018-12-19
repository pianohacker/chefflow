import multipart from '@request/multipart';

export let gapi = {};

const _CALLBACK_NAME = '__googleApiOnLoadCallback';
const _CLIENT_URL = `https://apis.google.com/js/client.js?onload=${_CALLBACK_NAME}`;
const _DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const _SCOPES = [
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.file',
];

// Based on https://github.com/BespokeView/Load-Google-API/blob/master/src/index.js
export function loadGAPI({ apiKey, clientId, scopes }) {
	return new Promise((resolve, reject) => {
		const clientScriptElement = document.createElement('script');

		clientScriptElement.src = _CLIENT_URL;
		window[_CALLBACK_NAME] = () => {
			Object.setPrototypeOf(gapi, window.gapi);
			resolve();
		};
		document.body.appendChild(clientScriptElement);
	}).then(() => {
		return new Promise((resolve, reject) => {
			gapi.load('client:auth2', {
				callback: resolve,
				onerror: reject,
			});
		});
	}).then(() => {
		return gapi.client.init({
			apiKey: apiKey,
			clientId: clientId,
			discoveryDocs: _DISCOVERY_DOCS,
			scope: _SCOPES.join(' '),
		});
	});
}

export async function driveList() {
	let { result } = await gapi.client.drive.files.list({
		spaces: 'appDataFolder',
		fields: 'files(id, name)',
		pageSize: 100,
	});

	return result.files || [];
}

export async function driveUpload({ fileId, metadata, contents }) {
	let { body, contentType } = multipart({
		multipart: [
			{
				"Content-Type": "application/json; charset=UTF-8",
				body: JSON.stringify(metadata),
			},
			{
				"Content-Type": "text/plain",
				"Content-Transfer-Encoding": "base64",
				body: btoa(contents),
			}
		]
	});

	let multipartRequestBody = '';

	await new Promise(resolve => {
		body.on('data', data => multipartRequestBody += new TextDecoder('utf-8').decode(data));
		body.on('end', resolve);
	});

	return gapi.client.request({
		'path': '/upload/drive/v3/files' + (fileId ? `/${fileId}` : ''),
		'method': fileId ? 'PATCH' : 'POST',
		'params': {'uploadType': 'multipart'},
		'headers': {
			'Content-Type': contentType,
		},
		'body': multipartRequestBody
	});
}

export async function driveDownload({ fileId }) {
	let { body } = await gapi.client.drive.files.get({
		fileId,
		alt: 'media',
	});

	return body;
}
