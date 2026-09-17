import { z } from "zod";
import { collectionService } from "./collection.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Provide a valid identifier.");

const authSchema = z.object({
	type: z.enum(["none", "bearer", "basic", "apiKey"]),
	bearer: z.object({ token: z.string().max(4000).optional() }).optional(),
	basic: z.object({ username: z.string().trim().max(254).optional(), password: z.string().max(1000).optional() }).optional(),
	apiKey: z
		.object({ key: z.string().trim().max(300).optional(), value: z.string().max(4000).optional(), addTo: z.enum(["header", "query"]).optional() })
		.optional(),
});

const createSchema = z.object({
	workspaceId: objectId,
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(1000).default(""),
	auth: authSchema.optional(),
});

const updateSchema = z
	.object({
		name: z.string().trim().min(1).max(120).optional(),
		description: z.string().trim().max(1000).optional(),
		auth: authSchema.optional(),
	})
	.refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

const listSchema = z.object({ workspaceId: objectId });

const folderCreateSchema = z.object({
	name: z.string().trim().min(1).max(120),
	parentId: objectId.nullable().optional(),
});

const folderRenameSchema = z.object({ name: z.string().trim().min(1).max(120) });

const folderOrderSchema = z.object({
	parentId: objectId.nullable().optional(),
	folderIds: z
		.array(objectId)
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, "List each folder only once."),
});

const orderSchema = z.object({
	workspaceId: objectId,
	collectionIds: z
		.array(objectId)
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, "List each collection only once."),
});

const searchSchema = z.object({
	workspaceId: objectId,
	q: z.string().trim().min(1).max(100),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

const duplicateSchema = z.object({ name: z.string().trim().min(1).max(120).optional() });

export async function listCollections(request, response, next) {
	try {
		const { workspaceId } = listSchema.parse(request.query);
		response.json({ data: await collectionService.list(workspaceId) });
	} catch (error) {
		next(error);
	}
}

export async function createCollection(request, response, next) {
	try {
		response.status(201).json({ data: await collectionService.create(createSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function updateCollection(request, response, next) {
	try {
		response.json({ data: await collectionService.update(request.params.collectionId, updateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function deleteCollection(request, response, next) {
	try {
		await collectionService.remove(request.params.collectionId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function addFolder(request, response, next) {
	try {
		response.status(201).json({ data: await collectionService.addFolder(request.params.collectionId, folderCreateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function renameFolder(request, response, next) {
	try {
		response.json({ data: await collectionService.renameFolder(request.params.collectionId, request.params.folderId, folderRenameSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function deleteFolder(request, response, next) {
	try {
		response.json({ data: await collectionService.removeFolder(request.params.collectionId, request.params.folderId) });
	} catch (error) {
		next(error);
	}
}

export async function reorderFolders(request, response, next) {
	try {
		response.json({ data: await collectionService.reorderFolders(request.params.collectionId, folderOrderSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function reorderCollections(request, response, next) {
	try {
		const { workspaceId, collectionIds } = orderSchema.parse(request.body);
		response.json({ data: await collectionService.reorder(workspaceId, collectionIds) });
	} catch (error) {
		next(error);
	}
}

export async function duplicateCollection(request, response, next) {
	try {
		response.status(201).json({ data: await collectionService.duplicate(request.params.collectionId, duplicateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function searchCollections(request, response, next) {
	try {
		const { workspaceId, q, limit } = searchSchema.parse(request.query);
		response.json({ data: await collectionService.search(workspaceId, q, limit) });
	} catch (error) {
		next(error);
	}
}
