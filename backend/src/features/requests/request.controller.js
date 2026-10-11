import { z } from "zod";
import { requestService } from "./request.service.js";
import { httpMethod, objectId } from "../../shared/validation/common.js";
import { authSchema, bodySchema, keyValueSchema } from "../../shared/validation/request.js";

const requestFields = {
	folderId: objectId.nullable().optional(),
	name: z.string().trim().min(1).max(160),
	description: z.string().trim().max(1000),
	method: httpMethod,
	url: z.string().trim().max(2048),
	queryParams: z.array(keyValueSchema).max(500),
	headers: z.array(keyValueSchema).max(500),
	body: bodySchema,
	auth: authSchema,
};

const createSchema = z.object({
	collectionId: objectId,
	...requestFields,
	description: requestFields.description.default(""),
	method: requestFields.method.default("GET"),
	url: requestFields.url.default(""),
	queryParams: requestFields.queryParams.default([]),
	headers: requestFields.headers.default([]),
	body: requestFields.body.default({ mode: "none" }),
	auth: requestFields.auth.optional(),
});

const updateSchema = z
	.object({
		name: requestFields.name.optional(),
		description: requestFields.description.optional(),
		folderId: requestFields.folderId,
		method: requestFields.method.optional(),
		url: requestFields.url.optional(),
		queryParams: requestFields.queryParams.optional(),
		headers: requestFields.headers.optional(),
		body: requestFields.body.optional(),
		auth: authSchema.optional(),
		order: z.number().int().min(0).optional(),
	})
	.refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

const listSchema = z.object({
	collectionId: objectId,
	folderId: z.union([objectId, z.literal("root")]).optional(),
});

const sendSchema = z.object({
	workspaceId: objectId,
	environmentId: objectId.optional(),
	method: httpMethod,
	url: z.string().trim().max(2048),
	queryParams: z.array(keyValueSchema).max(500).default([]),
	headers: z.array(keyValueSchema).max(500).default([]),
	body: bodySchema.default({ mode: "none" }),
	auth: authSchema.default({ type: "none" }),
});

const orderSchema = z.object({
	collectionId: objectId,
	folderId: objectId.nullable().optional(),
	requestIds: z
		.array(objectId)
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, "List each request only once."),
});

const searchSchema = z
	.object({
		workspaceId: objectId.optional(),
		collectionId: objectId.optional(),
		folderId: z.union([objectId, z.literal("root")]).optional(),
		q: z.string().trim().min(1).max(100),
		limit: z.coerce.number().int().min(1).max(200).default(50),
	})
	.refine((value) => value.workspaceId || value.collectionId, "Provide a workspace or collection to search.");

const duplicateSchema = z.object({
	name: z.string().trim().min(1).max(160).optional(),
	folderId: objectId.nullable().optional(),
});

export async function listRequests(request, response, next) {
	try {
		const { collectionId, folderId } = listSchema.parse(request.query);
		response.json({ data: await requestService.list(collectionId, folderId) });
	} catch (error) {
		next(error);
	}
}

export async function createRequest(request, response, next) {
	try {
		response.status(201).json({ data: await requestService.create(createSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function updateRequest(request, response, next) {
	try {
		response.json({ data: await requestService.update(request.params.requestId, updateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function deleteRequest(request, response, next) {
	try {
		await requestService.remove(request.params.requestId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function sendRequest(request, response, next) {
	try {
		response.json({ data: await requestService.sendSaved(request.params.requestId) });
	} catch (error) {
		next(error);
	}
}

export async function sendAdHocRequest(request, response, next) {
	try {
		response.json({ data: await requestService.sendAdHoc(sendSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function reorderRequests(request, response, next) {
	try {
		const { collectionId, folderId, requestIds } = orderSchema.parse(request.body);
		response.json({ data: await requestService.reorder(collectionId, { folderId, requestIds }) });
	} catch (error) {
		next(error);
	}
}

export async function duplicateRequest(request, response, next) {
	try {
		response.status(201).json({ data: await requestService.duplicate(request.params.requestId, duplicateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function searchRequests(request, response, next) {
	try {
		response.json({ data: await requestService.search(searchSchema.parse(request.query)) });
	} catch (error) {
		next(error);
	}
}
