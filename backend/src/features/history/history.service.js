import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { executeRequest } from "../requests/http.js";
import { requestService } from "../requests/request.service.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { historyRepository } from "./history.repository.js";

function ensureId(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "HISTORY_NOT_FOUND", "The requested history entry does not exist.");
}

async function loadEntry(id) {
	ensureId(id);
	const entry = await historyRepository.findById(id);
	if (!entry) throw new AppError(404, "HISTORY_NOT_FOUND", "The requested history entry does not exist.");
	return entry;
}

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
	}
}

export const historyService = {
	async list(workspaceId, options) {
		await ensureWorkspace(workspaceId);
		return historyRepository.list(workspaceId, options);
	},
	async remove(id) {
		await loadEntry(id);
		await historyRepository.remove(id);
	},
	async clear(workspaceId) {
		await ensureWorkspace(workspaceId);
		await historyRepository.removeByWorkspace(workspaceId);
	},
	async replay(id) {
		const entry = await loadEntry(id);
		const response = await executeRequest(entry.request, entry.request.auth);
		const created = await historyRepository.create({
			workspaceId: entry.workspaceId,
			environmentId: entry.environmentId,
			request: entry.request,
			response,
			sentAt: new Date(),
		});
		return { historyId: created._id, environmentId: entry.environmentId, request: entry.request, response };
	},
	async save(id, input) {
		const entry = await loadEntry(id);
		return requestService.create({
			collectionId: input.collectionId,
			folderId: input.folderId ?? null,
			name: input.name,
			method: entry.request.method,
			url: entry.request.rawUrl || entry.request.url,
			queryParams: entry.request.queryParams,
			headers: entry.request.headers,
			body: entry.request.body,
			auth: entry.request.auth,
		});
	},
};
