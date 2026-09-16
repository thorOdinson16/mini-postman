import mongoose from "mongoose";
import { authSchema } from "../../shared/schemas/auth.schema.js";
import { keyValueSchema } from "../../shared/schemas/key-value.schema.js";
import { requestBodySchema } from "../../shared/schemas/request-body.schema.js";

const headerPairSchema = new mongoose.Schema(
	{
		key: { type: String, default: "", trim: true, maxlength: 300 },
		value: { type: String, default: "", maxlength: 8000 },
	},
	{ _id: false },
);

const requestSnapshotSchema = new mongoose.Schema(
	{
		method: {
			type: String,
			enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
			required: true,
			uppercase: true,
		},
		url: { type: String, required: true, trim: true, maxlength: 4096 },
		rawUrl: { type: String, default: "", trim: true, maxlength: 2048 },
		queryParams: { type: [keyValueSchema], default: [] },
		headers: { type: [keyValueSchema], default: [] },
		body: { type: requestBodySchema, default: () => ({ mode: "none" }) },
		auth: { type: authSchema, default: () => ({ type: "none" }) },
	},
	{ _id: false },
);

const responseSchema = new mongoose.Schema(
	{
		status: { type: Number, default: 0 },
		statusText: { type: String, default: "" },
		ok: { type: Boolean, default: false },
		headers: { type: [headerPairSchema], default: [] },
		body: { type: String, default: "" },
		size: { type: Number, default: 0 },
		durationMs: { type: Number, default: 0 },
		contentType: { type: String, default: "" },
	},
	{ _id: false },
);

const historyEntrySchema = new mongoose.Schema(
	{
		workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
		environmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Environment", default: null },
		request: { type: requestSnapshotSchema, required: true },
		response: { type: responseSchema, required: true },
		sentAt: { type: Date, default: Date.now, required: true, index: true },
	},
	{ timestamps: true, versionKey: false },
);

historyEntrySchema.index({ workspaceId: 1, sentAt: -1 });

export const HistoryEntry = mongoose.model("HistoryEntry", historyEntrySchema);
