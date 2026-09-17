import { z } from "zod";
import { environmentService } from "./environment.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Provide a valid identifier.");

const variableSchema = z.object({
	key: z.string().trim().min(1).max(200),
	value: z.string().max(4000).default(""),
	enabled: z.boolean().default(true),
	secret: z.boolean().default(false),
	description: z.string().trim().max(300).default(""),
});

const variablesSchema = z
	.array(variableSchema)
	.max(500)
	.refine((variables) => new Set(variables.map((variable) => variable.key.toLowerCase())).size === variables.length, "Each variable key must be unique.");

const createSchema = z.object({
	workspaceId: objectId,
	name: z.string().trim().min(1).max(120),
	variables: variablesSchema.default([]),
	isActive: z.boolean().optional(),
});

const updateSchema = z
	.object({
		name: z.string().trim().min(1).max(120).optional(),
		variables: variablesSchema.optional(),
		isActive: z.boolean().optional(),
	})
	.refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

const listSchema = z.object({ workspaceId: objectId });

export async function listEnvironments(request, response, next) {
	try {
		const { workspaceId } = listSchema.parse(request.query);
		response.json({ data: await environmentService.list(workspaceId) });
	} catch (error) {
		next(error);
	}
}

export async function createEnvironment(request, response, next) {
	try {
		response.status(201).json({ data: await environmentService.create(createSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function updateEnvironment(request, response, next) {
	try {
		response.json({ data: await environmentService.update(request.params.environmentId, updateSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}

export async function deleteEnvironment(request, response, next) {
	try {
		await environmentService.remove(request.params.environmentId);
		response.status(204).send();
	} catch (error) {
		next(error);
	}
}
