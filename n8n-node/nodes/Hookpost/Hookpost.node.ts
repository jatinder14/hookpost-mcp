import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

async function hookpostRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('hookpostApi');
	const baseUrl = String(credentials.baseUrl || '').replace(/\/+$/, '');

	return (await this.helpers.httpRequestWithAuthentication.call(this, 'hookpostApi', {
		method,
		url: `${baseUrl}/public/v1${path}`,
		body,
		qs,
		json: true,
	})) as IDataObject | IDataObject[];
}

export class Hookpost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hookpost',
		name: 'hookpost',
		icon: { light: 'file:hookpost.svg', dark: 'file:hookpost.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule and publish social media posts with Hookpost',
		defaults: { name: 'Hookpost' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'hookpostApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Channel', value: 'channel' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
				],
				default: 'post',
			},

			// ---- Operations ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['post'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Schedule, publish now, or save a draft',
						action: 'Create a post',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a post by ID',
						action: 'Delete a post',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List posts in a date range',
						action: 'Get many posts',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['channel'] } },
				options: [
					{
						name: 'Find Free Slot',
						value: 'findSlot',
						description: 'Get the next free slot in the posting schedule',
						action: 'Find a free slot',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List connected channels',
						action: 'Get many channels',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['media'] } },
				options: [
					{
						name: 'Upload From URL',
						value: 'uploadFromUrl',
						description: 'Add an image or video from a public URL to the media library',
						action: 'Upload media from a URL',
					},
				],
				default: 'uploadFromUrl',
			},

			// ---- Post: Create ----
			{
				displayName: 'Channel Name or ID',
				name: 'integrationId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description:
					'The connected channel to post to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description: 'The post text',
			},
			{
				displayName: 'When',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Publish Now', value: 'now', description: 'Publish immediately' },
					{ name: 'Save as Draft', value: 'draft', description: 'Save without publishing' },
					{ name: 'Schedule', value: 'schedule', description: 'Queue it for the date below' },
				],
				default: 'schedule',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				displayOptions: { show: { resource: ['post'], operation: ['create'], type: ['schedule'] } },
				description: 'When to publish. Leave empty to use the next free slot in your schedule.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				options: [
					{
						displayName: 'Channel Settings (JSON)',
						name: 'settings',
						type: 'json',
						default: '',
						description:
							'Per-channel settings. Some channels require these: YouTube needs a title and visibility, Pinterest needs a board.',
					},
					{
						displayName: 'Media URLs',
						name: 'imageUrls',
						type: 'string',
						default: '',
						description:
							'Comma-separated URLs of media already in Hookpost (use Media → Upload From URL first)',
					},
				],
			},

			// ---- Post: Get Many ----
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
			},

			// ---- Post: Delete ----
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
			},

			// ---- Channel: Find Free Slot ----
			{
				displayName: 'Channel Name or ID',
				name: 'slotIntegrationId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['channel'], operation: ['findSlot'] } },
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},

			// ---- Media: Upload From URL ----
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['media'], operation: ['uploadFromUrl'] } },
				description: 'Publicly reachable URL of the image or video to add',
			},
		],
	};

	methods = {
		loadOptions: {
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const channels = await hookpostRequest.call(this, 'GET', '/integrations');
				const list = Array.isArray(channels) ? channels : [];
				return list.map((c) => ({
					name: `${String(c.name)} (${String(c.identifier ?? '')})`,
					value: String(c.id),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				let result: IDataObject | IDataObject[];

				if (resource === 'post' && operation === 'create') {
					const integrationId = this.getNodeParameter('integrationId', i) as string;
					const content = this.getNodeParameter('content', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const extra = this.getNodeParameter('additionalFields', i, {}) as {
						imageUrls?: string;
						settings?: string | IDataObject;
					};

					// A schedule with no date would be rejected, so fall back to the
					// next free slot, the same default the app itself uses.
					let date = this.getNodeParameter('date', i, '') as string;
					if (type === 'schedule' && !date) {
						const slot = (await hookpostRequest.call(
							this,
							'GET',
							`/find-slot/${integrationId}`,
						)) as IDataObject;
						date = String(slot.date ?? '');
					}

					const image = (extra.imageUrls || '')
						.split(',')
						.map((u) => u.trim())
						.filter(Boolean)
						.map((path) => ({ id: path, path }));

					let settings: IDataObject | undefined;
					if (extra.settings) {
						try {
							settings =
								typeof extra.settings === 'string'
									? (JSON.parse(extra.settings) as IDataObject)
									: extra.settings;
						} catch {
							throw new NodeOperationError(this.getNode(), 'Channel Settings is not valid JSON', {
								itemIndex: i,
							});
						}
					}

					result = await hookpostRequest.call(this, 'POST', '/posts', {
						type,
						date: date || new Date().toISOString(),
						shortLink: false,
						tags: [],
						posts: [
							{
								integration: { id: integrationId },
								value: [{ content, image }],
								...(settings ? { settings } : {}),
							},
						],
					});
				} else if (resource === 'post' && operation === 'getAll') {
					const res = (await hookpostRequest.call(this, 'GET', '/posts', undefined, {
						startDate: this.getNodeParameter('startDate', i) as string,
						endDate: this.getNodeParameter('endDate', i) as string,
					})) as IDataObject;
					result = (res.posts as IDataObject[]) ?? [];
				} else if (resource === 'post' && operation === 'delete') {
					const postId = this.getNodeParameter('postId', i) as string;
					result = await hookpostRequest.call(
						this,
						'DELETE',
						`/posts/${encodeURIComponent(postId)}`,
					);
				} else if (resource === 'channel' && operation === 'getAll') {
					result = await hookpostRequest.call(this, 'GET', '/integrations');
				} else if (resource === 'channel' && operation === 'findSlot') {
					const id = this.getNodeParameter('slotIntegrationId', i) as string;
					result = await hookpostRequest.call(this, 'GET', `/find-slot/${encodeURIComponent(id)}`);
				} else if (resource === 'media' && operation === 'uploadFromUrl') {
					result = await hookpostRequest.call(this, 'POST', '/upload-from-url', {
						url: this.getNodeParameter('fileUrl', i) as string,
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown operation: ${resource} ${operation}`,
						{ itemIndex: i },
					);
				}

				if (Array.isArray(result)) {
					out.push(...result.map((r) => ({ json: r, pairedItem: { item: i } })));
				} else {
					out.push({ json: result ?? {}, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [out];
	}
}
