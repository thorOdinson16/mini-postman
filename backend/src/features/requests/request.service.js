import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { buildVariableMap, resolveRequestParts } from "../../shared/utils/variables.js";
import { collectionRepository } from "../collections/collection.repository.js";
import { environmentRepository } from "../environments/environment.repository.js";
import { historyRepository } from "../history/history.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { executeRequest } from "./http.js";
import { selectAuth } from "./outgoing.js";
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

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
	}
}

async function nextAvailableName(baseName, collectionId) {
	let candidate = `${baseName} copy`;
	let counter = 2;
	while (await requestRepository.findByName(candidate, collectionId)) {
		candidate = `${baseName} copy ${counter}`;
		counter += 1;
	}
	return candidate;
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
		const variables = buildVariableMap(environment?.variables);
		const resolved = resolveRequestParts(request, variables);
		const auth = selectAuth(resolved.auth, collection.auth, variables);
		resolved.auth = auth;
		const response = await executeRequest(resolved, auth);
		await recordHistory(collection.workspaceId, environment?._id, resolved, response);
		return { requestId: request._id, environmentId: environment?._id ?? null, request: resolved, response };
	},
	async sendAdHoc(input) {
		await ensureWorkspace(input.workspaceId);
		const environment = await loadEnvironment(input.workspaceId, input.environmentId);
		const resolved = resolveRequestParts(input, buildVariableMap(environment?.variables));
		const response = await executeRequest(resolved, resolved.auth);
		await recordHistory(input.workspaceId, environment?._id, resolved, response);
		return { environmentId: environment?._id ?? null, request: resolved, response };
	},
	async reorder(collectionId, input) {
		const collection = await loadCollection(collectionId);
		const folderId = input.folderId ?? null;
		if (folderId) ensureFolder(collection, folderId);
		const existing = await requestRepository.list(collectionId, folderId);
		const existingIds = existing.map((request) => String(request._id));
		if (input.requestIds.some((id) => !existingIds.includes(String(id)))) {
			throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		}
		if (input.requestIds.length !== existingIds.length) {
			throw new AppError(400, "INVALID_REQUEST_ORDER", "Provide every request in this location exactly once.");
		}
		await requestRepository.setOrders(
			collectionId,
			folderId,
			input.requestIds.map((requestId, order) => ({ requestId, order })),
		);
		return requestRepository.list(collectionId, folderId);
	},
	async duplicate(id, input) {
		ensureId(id);
		const source = await requestRepository.findById(id);
		if (!source) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		const collection = await loadCollection(source.collectionId);
		const folderId = "folderId" in input ? input.folderId : source.folderId;
		if (folderId) ensureFolder(collection, folderId);
		const name = input.name ?? (await nextAvailableName(source.name, source.collectionId));
		return requestRepository.create({
			collectionId: source.collectionId,
			folderId: folderId ?? null,
			name,
			description: source.description ?? "",
			method: source.method,
			url: source.url,
			queryParams: source.queryParams ?? [],
			headers: source.headers ?? [],
			body: source.body ?? { mode: "none" },
			auth: source.auth ?? { type: "none" },
			order: await requestRepository.maxOrder(source.collectionId, folderId ?? null),
		});
	},
	async search(input) {
		const filter = {};
		if (input.collectionId) {
			const collection = await loadCollection(input.collectionId);
			if (input.workspaceId && String(collection.workspaceId) !== String(input.workspaceId)) {
				throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
			}
			if (input.folderId !== undefined && input.folderId !== "root") ensureFolder(collection, input.folderId);
			filter.collectionId = collection._id;
		} else {
			await ensureWorkspace(input.workspaceId);
			const collections = await collectionRepository.listIdsByWorkspace(input.workspaceId);
			filter.collectionId = { $in: collections.map((collection) => collection._id) };
		}
		if (input.folderId !== undefined) filter.folderId = input.folderId === "root" ? null : input.folderId;
		return requestRepository.search(filter, input.q, input.limit);
	},
};
