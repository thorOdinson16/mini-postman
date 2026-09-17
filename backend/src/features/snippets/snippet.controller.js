import { z } from "zod";
import { snippetService } from "./snippet.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Provide a valid identifier.");
const language = z.enum(["curl", "fetch", "node", "python", "all"]);
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
			method,
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
