import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { buildVariableMap, resolveRequestParts } from "../../shared/utils/variables.js";
import { collectionRepository } from "../collections/collection.repository.js";
import { environmentRepository } from "../environments/environment.repository.js";
import { historyRepository } from "../history/history.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { executeRequest } from "./http.js";
import { requestRepository } from "./request.repository.js";

function ensureId(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
}

async function loadCollection(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
	const collection = await collectionRepository.findById(id);
	if (!collection) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
	return collection;
}

function ensureFolder(collection, folderId) {
	if (folderId && !collection.folders.some((folder) => String(folder._id) === String(folderId))) {
		throw new AppError(404, "FOLDER_NOT_FOUND", "The selected folder does not belong to this collection.");
	}
}

async function loadEnvironment(workspaceId, environmentId) {
	if (environmentId) {
		if (!mongoose.isValidObjectId(environmentId)) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		const environment = await environmentRepository.findById(environmentId);
		if (!environment || String(environment.workspaceId) !== String(workspaceId)) {
			throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		}
		return environment;
	}
	return environmentRepository.findActive(workspaceId);
}

function selectAuth(requestAuth, collectionAuth) {
	if (requestAuth && requestAuth.type && requestAuth.type !== "none") return requestAuth;
	return collectionAuth ?? { type: "none" };
}

function toSnapshot(resolved) {
	return {
		method: resolved.method,
		url: resolved.url,
		rawUrl: resolved.rawUrl,
		queryParams: resolved.queryParams,
		headers: resolved.headers,
		body: resolved.body,
		auth: resolved.auth,
	};
}

function toResponseRecord(response) {
	return {
		status: response.status,
		statusText: response.statusText,
		ok: response.ok,
		headers: response.headers,
		body: response.body,
		size: response.size,
		durationMs: response.durationMs,
		contentType: response.contentType,
		truncated: response.truncated,
		error: response.error,
	};
}

async function recordHistory(workspaceId, environmentId, resolved, response) {
	await historyRepository.create({
		workspaceId,
		environmentId: environmentId ?? null,
		request: toSnapshot(resolved),
		response: toResponseRecord(response),
		sentAt: new Date(),
	});
}

export const requestService = {
	async list(collectionId, folderId) {
		await loadCollection(collectionId);
		return requestRepository.list(collectionId, folderId === "root" ? null : folderId);
	},
	async getById(id) {
		ensureId(id);
		const request = await requestRepository.findById(id);
		if (!request) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		return request;
	},
	async create(input) {
		const collection = await loadCollection(input.collectionId);
		ensureFolder(collection, input.folderId);
		const folderId = input.folderId ?? null;
		return requestRepository.create({
			collectionId: input.collectionId,
			folderId,
			name: input.name,
			description: input.description ?? "",
			method: input.method ?? "GET",
			url: input.url ?? "",
			queryParams: input.queryParams ?? [],
			headers: input.headers ?? [],
			...(input.body ? { body: input.body } : {}),
			...(input.auth ? { auth: input.auth } : {}),
			order: await requestRepository.maxOrder(input.collectionId, folderId),
		});
	},
	async update(id, input) {
		ensureId(id);
		const existing = await requestRepository.findById(id);
		if (!existing) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		const collection = await loadCollection(existing.collectionId);
		if ("folderId" in input) ensureFolder(collection, input.folderId);
		const changes = { ...input };
		if ("folderId" in input && String(input.folderId ?? "") !== String(existing.folderId ?? "")) {
			changes.order = await requestRepository.maxOrder(existing.collectionId, input.folderId ?? null);
		}
		const request = await requestRepository.update(id, changes);
		if (!request) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		return request;
	},
	async remove(id) {
		ensureId(id);
		const request = await requestRepository.findById(id);
		if (!request) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		await requestRepository.remove(id);
	},
	async sendSaved(id) {
		ensureId(id);
		const request = await requestRepository.findById(id);
		if (!request) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		const collection = await loadCollection(request.collectionId);
		const environment = await environmentRepository.findActive(collection.workspaceId);
		const resolved = resolveRequestParts(request, buildVariableMap(environment?.variables));
		const response = await executeRequest(resolved, selectAuth(resolved.auth, collection.auth));
		await recordHistory(collection.workspaceId, environment?._id, resolved, response);
		return { requestId: request._id, environmentId: environment?._id ?? null, request: resolved, response };
	},
	async sendAdHoc(input) {
		if (!mongoose.isValidObjectId(input.workspaceId) || !(await workspaceRepository.findById(input.workspaceId))) {
			throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
		}
		const environment = await loadEnvironment(input.workspaceId, input.environmentId);
		const resolved = resolveRequestParts(input, buildVariableMap(environment?.variables));
		const response = await executeRequest(resolved, resolved.auth);
		await recordHistory(input.workspaceId, environment?._id, resolved, response);
		return { environmentId: environment?._id ?? null, request: resolved, response };
	},
};
