import mongoose from "mongoose";

export async function connectDatabase(uri) {
	try {
		await mongoose.connect(uri);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

export async function ensureIndexes() {
	try {
		await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	} catch (error) {
		console.error(`Error: could not build database indexes. ${error.message}`);
		process.exit(1);
	}
}

export async function disconnectDatabase() {
	await mongoose.disconnect();
}
