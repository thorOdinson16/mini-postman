import mongoose from "mongoose";
import { authSchema } from "../../shared/schemas/auth.schema.js";
import { keyValueSchema } from "../../shared/schemas/key-value.schema.js";
import { requestBodySchema } from "../../shared/schemas/request-body.schema.js";

const requestSchema = new mongoose.Schema(
	{
		collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", required: true, index: true },
		folderId: { type: mongoose.Schema.Types.ObjectId, default: null },
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
		description: { type: String, default: "", trim: true, maxlength: 1000 },
		method: {
			type: String,
			enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
			default: "GET",
			required: true,
			uppercase: true,
		},
		url: { type: String, required: true, trim: true, maxlength: 2048, default: "" },
		queryParams: { type: [keyValueSchema], default: [] },
		headers: { type: [keyValueSchema], default: [] },
		body: { type: requestBodySchema, default: () => ({ mode: "none" }) },
		auth: { type: authSchema, default: () => ({ type: "none" }) },
		order: { type: Number, default: 0 },
	},
	{ timestamps: true, versionKey: false },
);

requestSchema.index({ collectionId: 1, folderId: 1, order: 1 });
requestSchema.index({ name: "text", url: "text", description: "text" });

export const Request = mongoose.model("Request", requestSchema);
