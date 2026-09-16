import { z } from "zod";
import { workspaceService } from "./workspace.service.js";

const createSchema = z.object({
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(500).default(""),
	isDefault: z.boolean().optional(),
});

const updateSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		description: z.string().trim().max(500).optional(),
		isDefault: z.boolean().optional(),
	})
	.refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export async function listWorkspaces(request, response, next) {
	try {
		response.json({ data: await workspaceService.list() });
	} catch (error) {
		next(error);
	}
}

export async function getWorkspace(request, response, next) {
	try {
		response.json({ data: await workspaceService.getById(request.params.workspaceId) });
	} catch (error) {
		next(error);
	}
}

export async function createWorkspace(request, response, next) {
	try {
		response.status(201).json({ data: await workspaceService.create(createSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function updateWorkspace(request, response, next) {
	try {
		response.json({ data: await workspaceService.update(request.params.workspaceId, updateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function deleteWorkspace(request, response, next) {
	try {
		await workspaceService.remove(request.params.workspaceId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}
