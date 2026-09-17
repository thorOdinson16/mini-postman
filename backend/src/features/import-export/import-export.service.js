import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { collectionRepository } from "../collections/collection.repository.js";
import { requestRepository } from "../requests/request.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { fromPostmanCollection, postmanFileName, toPostmanCollection } from "./postman-collection.js";

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
	}
}

async function nextAvailableName(baseName, workspaceId) {
	let candidate = baseName;
	let counter = 2;
	while (await collectionRepository.findByName(candidate, workspaceId)) {
		candidate = `${baseName} ${counter}`;
		counter += 1;
	}
	return candidate;
}

export const importExportService = {
	async exportCollection(collectionId) {
		if (!mongoose.isValidObjectId(collectionId)) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		const collection = await collectionRepository.findById(collectionId);
		if (!collection) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		const requests = await requestRepository.list(collectionId);
		return { collection: toPostmanCollection(collection, requests), filename: postmanFileName(collection.name) };
	},
	async importCollection(workspaceId, content) {
		await ensureWorkspace(workspaceId);
		const parsed = fromPostmanCollection(content);
		const name = await nextAvailableName(parsed.name, workspaceId);
		const collection = await collectionRepository.create({
			workspaceId,
			name,
			description: parsed.description,
			auth: parsed.auth,
			folders: parsed.folders,
			order: await collectionRepository.countByWorkspace(workspaceId),
		});
		if (parsed.requests.length) {
			await requestRepository.insertMany(parsed.requests.map((request) => ({ ...request, collectionId: collection._id })));
		}
		return collectionRepository.findById(collection._id);
	},
};
