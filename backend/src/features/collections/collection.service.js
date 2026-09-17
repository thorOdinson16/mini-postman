import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { requestRepository } from "../requests/request.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { collectionRepository } from "./collection.repository.js";

function ensureId(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
}

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
	}
}

async function ensureUniqueName(name, workspaceId, excludedId) {
	if (name && (await collectionRepository.findByName(name, workspaceId, excludedId))) {
		throw new AppError(409, "COLLECTION_NAME_CONFLICT", "A collection with this name already exists in this workspace.");
	}
}

const normalizeParentId = (value) => (value ? String(value) : null);
const sameParent = (left, right) => normalizeParentId(left) === normalizeParentId(right);

function findFolder(collection, folderId) {
	return collection.folders.find((folder) => String(folder._id) === String(folderId));
}

function ensureUniqueFolderName(folders, name, parentId, excludedId) {
	const normalized = name.trim().toLowerCase();
	const conflict = folders.some(
		(folder) =>
			String(folder._id) !== String(excludedId ?? "") &&
			sameParent(folder.parentId, parentId) &&
			String(folder.name).trim().toLowerCase() === normalized,
	);
	if (conflict) throw new AppError(409, "FOLDER_NAME_CONFLICT", "A folder with this name already exists here.");
}

async function loadCollection(id) {
	ensureId(id);
	const collection = await collectionRepository.findById(id);
	if (!collection) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
	return collection;
}

async function nextAvailableName(baseName, workspaceId) {
	let candidate = `${baseName} copy`;
	let counter = 2;
	while (await collectionRepository.findByName(candidate, workspaceId)) {
		candidate = `${baseName} copy ${counter}`;
		counter += 1;
	}
	return candidate;
}

export const collectionService = {
	async list(workspaceId) {
		await ensureWorkspace(workspaceId);
		return collectionRepository.list(workspaceId);
	},
	getById: (id) => loadCollection(id),
	async create(input) {
		await ensureWorkspace(input.workspaceId);
		await ensureUniqueName(input.name, input.workspaceId);
		let collection;
		try {
			collection = await collectionRepository.create({
				workspaceId: input.workspaceId,
				name: input.name,
				description: input.description ?? "",
				...(input.auth ? { auth: input.auth } : {}),
				folders: [],
				order: await collectionRepository.countByWorkspace(input.workspaceId),
			});
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "COLLECTION_NAME_CONFLICT", "A collection with this name already exists in this workspace.");
			throw error;
		}
		return collection;
	},
	async update(id, input) {
		ensureId(id);
		const existing = await collectionRepository.findById(id);
		if (!existing) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		await ensureUniqueName(input.name, existing.workspaceId, id);
		let collection;
		try {
			collection = await collectionRepository.update(id, input);
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "COLLECTION_NAME_CONFLICT", "A collection with this name already exists in this workspace.");
			throw error;
		}
		if (!collection) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		return collection;
	},
	async remove(id) {
		await loadCollection(id);
		await collectionRepository.remove(id);
	},
	async addFolder(collectionId, input) {
		const collection = await loadCollection(collectionId);
		const parentId = normalizeParentId(input.parentId);
		if (parentId && !findFolder(collection, parentId)) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		ensureUniqueFolderName(collection.folders, input.name, parentId);
		const siblings = collection.folders.filter((folder) => sameParent(folder.parentId, parentId));
		const order = siblings.length ? Math.max(...siblings.map((folder) => folder.order ?? 0)) + 1 : 0;
		const folder = {
			_id: new mongoose.Types.ObjectId(),
			name: input.name,
			parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
			order,
		};
		return collectionRepository.addFolder(collectionId, folder);
	},
	async renameFolder(collectionId, folderId, input) {
		const collection = await loadCollection(collectionId);
		const folder = findFolder(collection, folderId);
		if (!folder) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		ensureUniqueFolderName(collection.folders, input.name, folder.parentId, folderId);
		const updated = await collectionRepository.renameFolder(collectionId, folderId, input.name);
		if (!updated) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		return updated;
	},
	async removeFolder(collectionId, folderId) {
		const collection = await loadCollection(collectionId);
		if (!findFolder(collection, folderId)) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		if (collection.folders.some((folder) => sameParent(folder.parentId, folderId))) {
			throw new AppError(409, "FOLDER_NOT_EMPTY", "Delete this folder's subfolders before deleting it.");
		}
		const updated = await collectionRepository.removeFolder(collectionId, folderId);
		if (!updated) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		return updated;
	},
	async reorderFolders(collectionId, input) {
		const collection = await loadCollection(collectionId);
		const parentId = normalizeParentId(input.parentId);
		if (parentId && !findFolder(collection, parentId)) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		const provided = input.folderIds.map(String);
		if (!provided.every((id) => findFolder(collection, id))) throw new AppError(404, "FOLDER_NOT_FOUND", "The requested folder does not exist.");
		const siblingIds = collection.folders.filter((folder) => sameParent(folder.parentId, parentId)).map((folder) => String(folder._id));
		const complete = provided.length === siblingIds.length && provided.every((id) => siblingIds.includes(id));
		if (!complete) throw new AppError(400, "INVALID_FOLDER_ORDER", "Provide every folder in this location exactly once.");
		await collectionRepository.setFolderOrders(
			collectionId,
			provided.map((folderId, order) => ({ folderId, order })),
		);
		return collectionRepository.findById(collectionId);
	},
	async reorder(workspaceId, collectionIds) {
		await ensureWorkspace(workspaceId);
		const existing = await collectionRepository.list(workspaceId);
		const existingIds = existing.map((collection) => String(collection._id));
		if (collectionIds.some((id) => !existingIds.includes(String(id)))) {
			throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		}
		if (collectionIds.length !== existingIds.length) {
			throw new AppError(400, "INVALID_COLLECTION_ORDER", "Provide every collection in this workspace exactly once.");
		}
		await collectionRepository.setOrders(
			workspaceId,
			collectionIds.map((collectionId, order) => ({ collectionId, order })),
		);
		return collectionRepository.list(workspaceId);
	},
	async duplicate(id, input) {
		const source = await loadCollection(id);
		if (input.name) await ensureUniqueName(input.name, source.workspaceId);
		const name = input.name ?? (await nextAvailableName(source.name, source.workspaceId));
		const folderIdMap = new Map(source.folders.map((folder) => [String(folder._id), new mongoose.Types.ObjectId()]));
		const folders = source.folders.map((folder) => ({
			_id: folderIdMap.get(String(folder._id)),
			name: folder.name,
			parentId: folder.parentId && folderIdMap.has(String(folder.parentId)) ? folderIdMap.get(String(folder.parentId)) : null,
			order: folder.order ?? 0,
		}));
		let collection;
		try {
			collection = await collectionRepository.create({
				workspaceId: source.workspaceId,
				name,
				description: source.description ?? "",
				auth: source.auth,
				folders,
				order: await collectionRepository.countByWorkspace(source.workspaceId),
			});
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "COLLECTION_NAME_CONFLICT", "A collection with this name already exists in this workspace.");
			throw error;
		}
		const sourceRequests = await requestRepository.list(source._id);
		if (sourceRequests.length) {
			await requestRepository.insertMany(
				sourceRequests.map((request) => ({
					collectionId: collection._id,
					folderId: request.folderId && folderIdMap.has(String(request.folderId)) ? folderIdMap.get(String(request.folderId)) : null,
					name: request.name,
					description: request.description ?? "",
					method: request.method,
					url: request.url,
					queryParams: request.queryParams ?? [],
					headers: request.headers ?? [],
					body: request.body ?? { mode: "none" },
					auth: request.auth ?? { type: "none" },
					order: request.order ?? 0,
				})),
			);
		}
		return collectionRepository.findById(collection._id);
	},
	async search(workspaceId, query, limit) {
		await ensureWorkspace(workspaceId);
		return collectionRepository.search(workspaceId, query, limit);
	},
};
