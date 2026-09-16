import mongoose from "mongoose";

export const keyValueSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, trim: true, maxlength: 300 },
		value: { type: String, default: "", maxlength: 8000 },
		enabled: { type: Boolean, default: true },
		description: { type: String, default: "", trim: true, maxlength: 300 },
	},
	{ _id: false },
);
