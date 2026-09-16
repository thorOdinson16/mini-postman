import mongoose from "mongoose";
import { authSchema } from "../../shared/schemas/auth.schema.js";

const folderSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
	parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
	order: { type: Number, default: 0 },
});

const collectionSchema = new mongoose.Schema(
	{
		workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		description: { type: String, default: "", trim: true, maxlength: 1000 },
		auth: { type: authSchema, default: () => ({ type: "none" }) },
		folders: { type: [folderSchema], default: [] },
		order: { type: Number, default: 0 },
	},
	{ timestamps: true, versionKey: false },
);

collectionSchema.index({ workspaceId: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
collectionSchema.index({ workspaceId: 1, order: 1 });

export const Collection = mongoose.model("Collection", collectionSchema);
