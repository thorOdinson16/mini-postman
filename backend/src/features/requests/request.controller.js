import { z } from "zod";
import { requestService } from "./request.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Provide a valid identifier.");
const method = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

const keyValueSchema = z.object({
	key: z.string().trim().min(1).max(300),
	value: z.string().max(8000).default(""),
	enabled: z.boolean().default(true),
	description: z.string().trim().max(300).default(""),
});

const formFieldSchema = keyValueSchema.extend({ type: z.enum(["text", "file"]).default("text") });

const bodySchema = z.object({
	mode: z.enum(["none", "json", "text", "formData", "urlEncoded"]).default("none"),
	raw: z.string().default(""),
	formData: z.array(formFieldSchema).max(500).default([]),
	urlEncoded: z.array(keyValueSchema).max(500).default([]),
});

const authSchema = z.object({
	type: z.enum(["none", "bearer", "basic", "apiKey"]),
	bearer: z.object({ token: z.string().max(4000).optional() }).optional(),
	basic: z.object({ username: z.string().trim().max(254).optional(), password: z.string().max(1000).optional() }).optional(),
	apiKey: z
		.object({ key: z.string().trim().max(300).optional(), value: z.string().max(4000).optional(), addTo: z.enum(["header", "query"]).optional() })
		.optional(),
});

const requestFields = {
	folderId: objectId.nullable().optional(),
	name: z.string().trim().min(1).max(160),
	description: z.string().trim().max(1000),
	method,
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
	method,
	url: z.string().trim().max(2048),
	queryParams: z.array(keyValueSchema).max(500).default([]),
	headers: z.array(keyValueSchema).max(500).default([]),
	body: bodySchema.default({ mode: "none" }),
	auth: authSchema.default({ type: "none" }),
});

export async function listRequests(request, response, next) {
	try {
		const { collectionId, folderId } = listSchema.parse(request.query);
		response.json({ data: await requestService.list(collectionId, folderId) });
	} catch (error) {
		next(error);
	}
}

export async function getRequest(request, response, next) {
	try {
		response.json({ data: await requestService.getById(request.params.requestId) });
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
