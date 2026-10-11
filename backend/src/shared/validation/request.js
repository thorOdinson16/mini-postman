import { z } from "zod";

export const keyValueSchema = z.object({
	key: z.string().trim().min(1).max(300),
	value: z.string().max(8000).default(""),
	enabled: z.boolean().default(true),
	description: z.string().trim().max(300).default(""),
});

const formFieldSchema = keyValueSchema.extend({ type: z.enum(["text", "file"]).default("text") });

export const bodySchema = z.object({
	mode: z.enum(["none", "json", "text", "formData", "urlEncoded"]).default("none"),
	raw: z.string().default(""),
	formData: z.array(formFieldSchema).max(500).default([]),
	urlEncoded: z.array(keyValueSchema).max(500).default([]),
});

export const authSchema = z.object({
	type: z.enum(["none", "bearer", "basic", "apiKey"]),
	bearer: z.object({ token: z.string().max(4000).optional() }).optional(),
	basic: z.object({ username: z.string().trim().max(254).optional(), password: z.string().max(1000).optional() }).optional(),
	apiKey: z
		.object({ key: z.string().trim().max(300).optional(), value: z.string().max(4000).optional(), addTo: z.enum(["header", "query"]).optional() })
		.optional(),
});
