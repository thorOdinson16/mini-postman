import mongoose from "mongoose";
import "../../src/features/auth/workspace-account.model.js";
import "../../src/features/collections/collection.model.js";
import "../../src/features/environments/environment.model.js";
import "../../src/features/history/history-entry.model.js";
import "../../src/features/requests/request.model.js";
import "../../src/features/workspaces/workspace.model.js";
import { ensureIndexes } from "../../src/shared/config/database.js";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/postman_test";

export async function openTestDatabase() {
	await mongoose.connect(TEST_MONGODB_URI);
	await mongoose.connection.dropDatabase();
	await ensureIndexes();
}

export async function closeTestDatabase() {
	await mongoose.connection.dropDatabase();
	await mongoose.disconnect();
}
