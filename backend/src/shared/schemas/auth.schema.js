import mongoose from "mongoose";

export const authSchema = new mongoose.Schema(
	{
		type: { type: String, enum: ["none", "bearer", "basic", "apiKey"], default: "none", required: true },
		bearer: {
			token: { type: String, default: "", maxlength: 4000 },
		},
		basic: {
			username: { type: String, default: "", trim: true, maxlength: 254 },
			password: { type: String, default: "", maxlength: 1000 },
		},
		apiKey: {
			key: { type: String, default: "", trim: true, maxlength: 300 },
			value: { type: String, default: "", maxlength: 4000 },
			addTo: { type: String, enum: ["header", "query"], default: "header" },
		},
	},
	{ _id: false },
);
