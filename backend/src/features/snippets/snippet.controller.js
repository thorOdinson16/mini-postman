import { z } from "zod";
import { snippetService } from "./snippet.service.js";
import { httpMethod, objectId } from "../../shared/validation/common.js";
import { authSchema, bodySchema, keyValueSchema } from "../../shared/validation/request.js";

const language = z.enum(["curl", "fetch", "node", "python", "all"]);

const savedSchema = z.object({
	language: language.default("all"),
	environmentId: objectId.optional(),
});

const inlineSchema = z
	.object({
		language: language.default("all"),
		workspaceId: objectId.optional(),
		environmentId: objectId.optional(),
		request: z.object({
			method: httpMethod,
			url: z.string().trim().max(2048),
			queryParams: z.array(keyValueSchema).max(500).default([]),
			headers: z.array(keyValueSchema).max(500).default([]),
			body: bodySchema.default({ mode: "none" }),
			auth: authSchema.default({ type: "none" }),
		}),
	})
	.refine((value) => !value.environmentId || value.workspaceId, "Provide a workspace when selecting an environment.");

export async function generateSavedSnippet(request, response, next) {
	try {
		const { language, environmentId } = savedSchema.parse(request.query);
		response.json({ data: await snippetService.generateSaved(request.params.requestId, { language, environmentId }) });
	} catch (error) {
		next(error);
	}
}

export async function generateInlineSnippet(request, response, next) {
	try {
		response.json({ data: await snippetService.generateInline(inlineSchema.parse(request.body)) });
	} catch (error) {
		next(error);
	}
}
