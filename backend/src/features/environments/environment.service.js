import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { historyRepository } from "../history/history.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { environmentRepository } from "./environment.repository.js";

function ensureId(id) {
	if (!mongoose.isValidObjectId(id)) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
}

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
	}
}

async function ensureUniqueName(name, workspaceId, excludedId) {
	if (name && (await environmentRepository.findByName(name, workspaceId, excludedId))) {
		throw new AppError(409, "ENVIRONMENT_NAME_CONFLICT", "An environment with this name already exists in this workspace.");
	}
}

export const environmentService = {
	async list(workspaceId) {
		await ensureWorkspace(workspaceId);
		return environmentRepository.list(workspaceId);
	},
	async getById(id) {
		ensureId(id);
		const environment = await environmentRepository.findById(id);
		if (!environment) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		return environment;
	},
	async create(input) {
		await ensureWorkspace(input.workspaceId);
		await ensureUniqueName(input.name, input.workspaceId);
		const isFirst = (await environmentRepository.countByWorkspace(input.workspaceId)) === 0;
		const shouldActivate = isFirst || input.isActive === true;
		let environment;
		try {
			environment = await environmentRepository.create({
				workspaceId: input.workspaceId,
				name: input.name,
				variables: input.variables ?? [],
				isActive: shouldActivate,
			});
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "ENVIRONMENT_NAME_CONFLICT", "An environment with this name already exists in this workspace.");
			throw error;
		}
		if (shouldActivate) await environmentRepository.clearActive(input.workspaceId, environment._id);
		return environment;
	},
	async update(id, input) {
		ensureId(id);
		const existing = await environmentRepository.findById(id);
		if (!existing) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		await ensureUniqueName(input.name, existing.workspaceId, id);
		let environment;
		try {
			environment = await environmentRepository.update(id, input);
		} catch (error) {
			if (error?.code === 11000) throw new AppError(409, "ENVIRONMENT_NAME_CONFLICT", "An environment with this name already exists in this workspace.");
			throw error;
		}
		if (!environment) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		if (input.isActive === true) await environmentRepository.clearActive(existing.workspaceId, id);
		return environment;
	},
	async remove(id) {
		ensureId(id);
		const environment = await environmentRepository.findById(id);
		if (!environment) throw new AppError(404, "ENVIRONMENT_NOT_FOUND", "The requested environment does not exist.");
		await historyRepository.clearEnvironment(environment.workspaceId, id);
		await environmentRepository.remove(id);
		if (environment.isActive) {
			const replacement = await environmentRepository.findOldestExcluding(environment.workspaceId, id);
			if (replacement) await environmentRepository.update(replacement._id, { isActive: true });
		}
	},
};
