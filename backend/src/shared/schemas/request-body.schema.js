import mongoose from "mongoose";
import { keyValueSchema } from "./key-value.schema.js";

const formFieldSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, trim: true, maxlength: 300 },
		value: { type: String, default: "", maxlength: 8000 },
		type: { type: String, enum: ["text", "file"], default: "text", required: true },
		enabled: { type: Boolean, default: true },
		description: { type: String, default: "", trim: true, maxlength: 300 },
	},
	{ _id: false },
);

export const requestBodySchema = new mongoose.Schema(
	{
		mode: { type: String, enum: ["none", "json", "text", "formData", "urlEncoded"], default: "none", required: true },
		raw: { type: String, default: "" },
		formData: { type: [formFieldSchema], default: [] },
		urlEncoded: { type: [keyValueSchema], default: [] },
	},
	{ _id: false },
);
