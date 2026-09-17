import { z } from "zod";
import { historyService } from "./history.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Provide a valid identifier.");

const listSchema = z.object({
	workspaceId: objectId,
	environmentId: objectId.optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

const clearSchema = z.object({ workspaceId: objectId });

const saveSchema = z.object({
	collectionId: objectId,
	folderId: objectId.nullable().optional(),
	name: z.string().trim().min(1).max(160),
});

export async function listHistory(request, response, next) {
	try {
		const { workspaceId, environmentId, limit } = listSchema.parse(request.query);
		response.json({ data: await historyService.list(workspaceId, { environmentId, limit }) });
	} catch (error) {
		next(error);
	}
}

export async function getHistory(request, response, next) {
	try {
		response.json({ data: await historyService.getById(request.params.historyId) });
	} catch (error) {
		next(error);
	}
}

export async function deleteHistory(request, response, next) {
	try {
		await historyService.remove(request.params.historyId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function clearHistory(request, response, next) {
	try {
		const { workspaceId } = clearSchema.parse(request.query);
		await historyService.clear(workspaceId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function replayHistory(request, response, next) {
	try {
		response.json({ data: await historyService.replay(request.params.historyId) });
	} catch (error) {
		next(error);
	}
}

export async function saveHistory(request, response, next) {
	try {
		response.status(201).json({ data: await historyService.save(request.params.historyId, saveSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}
