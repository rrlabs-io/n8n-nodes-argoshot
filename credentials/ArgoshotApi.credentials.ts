import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// The access key from the API keys page of the Argoshot dashboard. Sent as the X-Access-Key header
// (never in the query). The credential test is GET /usage: it needs a valid key and costs nothing.
export class ArgoshotApi implements ICredentialType {
	name = 'argoshotApi';

	displayName = 'Argoshot API';

	documentationUrl = 'https://argoshot.com/docs';

	icon = 'file:argoshot.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Access Key',
			name: 'accessKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'From the API keys page of your Argoshot dashboard. A key set to "signed requests only" cannot be used here: create one that allows unsigned requests.',
		},
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.argoshot.com',
			description: 'Change only to test against another Argoshot host',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Access-Key': '={{$credentials.accessKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/usage',
			method: 'GET',
		},
	};
}
