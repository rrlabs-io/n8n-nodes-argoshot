import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// What the node never lets the free-form JSON override: it decides these itself.
const RESERVED = ['access_key', 'signature', 'response_type', 'url', 'html', 'markdown', 'format', 'async', 'store'];

const MIME: Record<string, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	pdf: 'application/pdf',
};

export class Argoshot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Argoshot',
		name: 'argoshot',
		icon: { light: 'file:argoshot.svg', dark: 'file:argoshot.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Screenshots, PDFs and Open Graph images of any public web page or HTML',
		defaults: {
			name: 'Argoshot',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'argoshotApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Screenshot',
						value: 'screenshot',
						description: 'Render a web page or HTML to an image or a PDF',
						action: 'Take a screenshot',
					},
					{
						name: 'Usage',
						value: 'usage',
						description: 'Get the renders used and left, and the limits. Costs nothing.',
						action: 'Get usage',
					},
				],
				default: 'screenshot',
			},

			// ---- Screenshot
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{ name: 'URL', value: 'url' },
					{ name: 'HTML', value: 'html' },
				],
				default: 'url',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com',
				description: 'The public address of the page to render',
				displayOptions: { show: { operation: ['screenshot'], source: ['url'] } },
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				description:
					'HTML (with its CSS) to render: an Open Graph card, an invoice. Images and fonts in it need absolute or data: URLs.',
				displayOptions: { show: { operation: ['screenshot'], source: ['html'] } },
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'PNG', value: 'png' },
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'WebP', value: 'webp' },
					{ name: 'PDF', value: 'pdf' },
				],
				default: 'png',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Download File',
				name: 'download',
				type: 'boolean',
				default: true,
				description:
					'Whether to download the result and return it as binary data. The result URL is kept about 4 hours unless you set "Keep Result For" below. Downloading costs nothing extra.',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'The name of the output binary field to put the file in',
				displayOptions: { show: { operation: ['screenshot'], download: [true] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['screenshot'] } },
				options: [
					{
						displayName: 'Block Ads',
						name: 'blockAds',
						type: 'boolean',
						default: false,
						description: 'Whether to block ads (their requests are never made)',
					},
					{
						displayName: 'Dark Mode',
						name: 'darkMode',
						type: 'boolean',
						default: false,
						description: 'Whether to ask the page for its dark theme (prefers-color-scheme: dark)',
					},
					{
						displayName: 'Delay (Seconds)',
						name: 'delay',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 300 },
						default: 0,
						description: 'Seconds to wait before the capture',
					},
					{
						displayName: 'Device Name or ID',
						name: 'device',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getDevices' },
						default: '',
						description:
							'Render as this phone, tablet or screen. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Full Page',
						name: 'fullPage',
						type: 'boolean',
						default: false,
						description: 'Whether to capture the whole page, not only the first screen',
					},
					{
						displayName: 'Hide Cookie Banners',
						name: 'blockCookieBanners',
						type: 'boolean',
						default: false,
						description: 'Whether to hide cookie and consent banners',
					},
					{
						displayName: 'Image Quality',
						name: 'imageQuality',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 100 },
						default: 80,
						description: 'Encoder quality for JPEG and WebP',
					},
					{
						displayName: 'Keep Result For (Hours)',
						name: 'keepHours',
						type: 'number',
						typeOptions: { minValue: 4, maxValue: 720 },
						default: 4,
						description:
							'How long the result URL works, 4 to 720 hours (30 days). The URL is public to anyone who has it.',
					},
					{
						displayName: 'Other Options (JSON)',
						name: 'otherOptions',
						type: 'json',
						default: '{}',
						description:
							'Any other option of the API by name, like {"pdf_paper_format": "a4"}. All options: https://argoshot.com/docs/options.',
					},
					{
						displayName: 'Selector',
						name: 'selector',
						type: 'string',
						default: '',
						placeholder: '#hero',
						description: 'Capture only the element matching this CSS selector',
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 20000 },
						default: 1024,
						description: 'Viewport height in pixels. Overrides the device.',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 10000 },
						default: 1280,
						description: 'Viewport width in pixels. Overrides the device.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// The device presets: GET /devices (public, no key).
			async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('argoshotApi');
				const devices = (await this.helpers.httpRequestWithAuthentication.call(this, 'argoshotApi', {
					method: 'GET',
					url: `${apiBase(credentials.baseUrl)}/devices`,
					json: true,
				})) as Array<{ id: string; width: number; height: number }>;
				return [
					{ name: 'Desktop Window (Default)', value: '' },
					...devices.map((d) => ({ name: `${d.id} (${d.width} × ${d.height})`, value: d.id })),
				];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('argoshotApi');
		const base = apiBase(credentials.baseUrl);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'usage') {
					const usage = await request.call(this, i, { method: 'GET', url: `${base}/usage` });
					returnData.push({ json: usage.body as IDataObject, pairedItem: { item: i } });
					continue;
				}

				// ---- screenshot
				const source = this.getNodeParameter('source', i) as string;
				const format = this.getNodeParameter('format', i) as string;
				const download = this.getNodeParameter('download', i) as boolean;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				let other: IDataObject = {};
				if (options.otherOptions) {
					other =
						typeof options.otherOptions === 'string'
							? (JSON.parse(options.otherOptions) as IDataObject)
							: (options.otherOptions as IDataObject);
					if (other === null || typeof other !== 'object' || Array.isArray(other)) {
						throw new NodeOperationError(this.getNode(), 'Other Options must be a JSON object', {
							itemIndex: i,
						});
					}
					for (const key of RESERVED) delete other[key];
				}

				const body: IDataObject = {
					...other,
					format,
					response_type: 'json',
					metadata_page_title: true,
					metadata_http_response_status_code: true,
				};
				if (format !== 'pdf') body.metadata_image_size = true; // (an image option)
				if (source === 'url') body.url = this.getNodeParameter('url', i) as string;
				else body.html = this.getNodeParameter('html', i) as string;

				if (options.device) body.viewport_device = options.device;
				if (options.viewportWidth) body.viewport_width = options.viewportWidth;
				if (options.viewportHeight) body.viewport_height = options.viewportHeight;
				if (options.selector) body.selector = options.selector;
				if (options.delay) body.delay = options.delay;
				if (options.imageQuality !== undefined && format !== 'pdf') body.image_quality = options.imageQuality;
				// (booleans are sent only when set: unset means the API's default)
				if (options.fullPage) body.full_page = true;
				if (options.darkMode) body.dark_mode = true;
				if (options.blockAds) body.block_ads = true;
				if (options.blockCookieBanners) body.block_cookie_banners = true;
				if ((options.keepHours as number) > 4) {
					body.cache = true;
					body.cache_ttl = Math.min(Math.round((options.keepHours as number) * 3600), 2592000);
				}

				const rendered = await request.call(this, i, { method: 'POST', url: `${base}/take`, body });
				const result = rendered.body as IDataObject;
				const metadata = (result.metadata as IDataObject | undefined) ?? {};
				const size = (metadata.image_size as IDataObject | undefined) ?? {};
				const screenshotUrl = result.screenshot_url as string | undefined;
				if (!screenshotUrl) {
					throw new NodeOperationError(this.getNode(), 'Argoshot finished but returned no result URL. Try again.', {
						itemIndex: i,
					});
				}

				const json: IDataObject = {
					screenshotUrl,
					format,
					pageTitle: metadata.page_title as string | undefined,
					imageWidth: size.width as number | undefined,
					imageHeight: size.height as number | undefined,
					httpStatus: metadata.http_response_status_code as number | undefined,
					// 1 for a new render, 0 when it was answered from the cache
					creditsUsed: rendered.headers['x-credits'] as string | undefined,
				};
				const out: INodeExecutionData = { json, pairedItem: { item: i } };

				if (download) {
					// (the result link is public by its own token: no key is sent to it)
					const file = await downloadResult.call(this, screenshotUrl);
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					out.binary = {
						[binaryPropertyName]: await this.helpers.prepareBinaryData(
							Buffer.from(file),
							`argoshot.${format}`,
							MIME[format],
						),
					};
				}
				returnData.push(out);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// (the node's own errors keep their message, code and link; anything else is wrapped)
				const failure =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				throw failure;
			}
		}
		return [returnData];
	}
}

function apiBase(value: unknown): string {
	const url = typeof value === 'string' && value ? value : 'https://api.argoshot.com';
	return url.replace(/\/+$/, '');
}

// The result file. Its link is public by its own token: the key is deliberately not sent to it.
async function downloadResult(this: IExecuteFunctions, url: string): Promise<ArrayBuffer> {
	return (await this.helpers.httpRequest({
		method: 'GET',
		url,
		encoding: 'arraybuffer',
		json: false,
	})) as ArrayBuffer;
}

// One call to the API with the credential's key. A 4xx or 5xx becomes an error with the API's own
// words (error_message, plus the upgrade or documentation link).
async function request(
	this: IExecuteFunctions,
	itemIndex: number,
	options: IHttpRequestOptions,
): Promise<{ body: unknown; headers: IDataObject }> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'argoshotApi', {
		...options,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { body: IDataObject; headers: IDataObject; statusCode: number };

	if (response.statusCode >= 400) {
		const body = (response.body ?? {}) as IDataObject;
		const message = (body.error_message as string | undefined) ?? `Argoshot answered ${response.statusCode}`;
		const link = (body.upgrade_url as string | undefined) ?? (body.documentation_url as string | undefined);
		throw new NodeApiError(this.getNode(), body as JsonObject, {
			message,
			description: [body.error_code, link].filter(Boolean).join(' · ') || undefined,
			httpCode: String(response.statusCode),
			itemIndex,
		});
	}
	return { body: response.body, headers: response.headers };
}
