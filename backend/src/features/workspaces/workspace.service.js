import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { workspaceRepository } from "./workspace.repository.js";

function ensureId(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
}

async function ensureUniqueName(name, excludedId) {
	if (name && (await workspaceRepository.findByName(name, excludedId))) {
		throw new AppError(409, "WORKSPACE_NAME_CONFLICT", "A workspace with this name already exists.");
	}
}

export const workspaceService = {
	list: () => workspaceRepository.list(),
	async getById(id) {
		ensureId(id);
		const workspace = await workspaceRepository.findById(id);
		if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
		return workspace;
	},
	async create(input) {
		await ensureUniqueName(input.name);
		const isFirst = (await workspaceRepository.count()) === 0;
		const shouldDefault = isFirst || input.isDefault === true;
		let workspace;
		try {
			workspace = await workspaceRepository.create({
				name: input.name,
				description: input.description ?? "",
				isDefault: shouldDefault,
			});
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "WORKSPACE_NAME_CONFLICT", "A workspace with this name already exists.");
			throw error;
		}
		if (shouldDefault) await workspaceRepository.clearDefault(workspace._id);
		return workspace;
	},
	async update(id, input) {
		ensureId(id);
		await ensureUniqueName(input.name, id);
		if (!(await workspaceRepository.findById(id))) throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
		let workspace;
		try {
			workspace = await workspaceRepository.update(id, input);
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "WORKSPACE_NAME_CONFLICT", "A workspace with this name already exists.");
			throw error;
		}
		if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
		if (input.isDefault === true) await workspaceRepository.clearDefault(id);
		return workspace;
	},
	async remove(id) {
		ensureId(id);
		const workspace = await workspaceRepository.findById(id);
		if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
		if (workspace.isDefault) {
			const replacement = await workspaceRepository.findOldestExcluding(id);
			if (!replacement) throw new AppError(409, "DEFAULT_WORKSPACE", "The only workspace cannot be deleted.");
			await workspaceRepository.update(replacement._id, { isDefault: true });
		}
		await workspaceRepository.remove(id);
	},
};
