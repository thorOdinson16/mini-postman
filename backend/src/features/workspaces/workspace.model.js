import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
		description: { type: String, default: "", trim: true, maxlength: 500 },
		isDefault: { type: Boolean, default: false },
	},
	{ timestamps: true, versionKey: false },
);

workspaceSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Workspace = mongoose.model("Workspace", workspaceSchema);
