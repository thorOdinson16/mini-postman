import mongoose from "mongoose";

const environmentVariableSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, trim: true, maxlength: 200 },
		value: { type: String, default: "", maxlength: 4000 },
		enabled: { type: Boolean, default: true },
		secret: { type: Boolean, default: false },
		description: { type: String, default: "", trim: true, maxlength: 300 },
	},
	{ _id: false },
);

const environmentSchema = new mongoose.Schema(
	{
		workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
		name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
		variables: { type: [environmentVariableSchema], default: [] },
		isActive: { type: Boolean, default: false },
	},
	{ timestamps: true, versionKey: false },
);

environmentSchema.index({ workspaceId: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Environment = mongoose.model("Environment", environmentSchema);
