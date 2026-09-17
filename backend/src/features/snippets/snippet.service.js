import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { buildVariableMap, resolveRequestParts } from "../../shared/utils/variables.js";
import { collectionRepository } from "../collections/collection.repository.js";
import { environmentRepository } from "../environments/environment.repository.js";
import { buildSnippetRequest, selectAuth } from "../requests/outgoing.js";
import { requestRepository } from "../requests/request.repository.js";
import { workspaceRepository } from "../workspaces/workspace.repository.js";
import { curlSnippet } from "./generators/curl.js";
import { fetchSnippet } from "./generators/fetch.js";
import { nodeSnippet } from "./generators/node.js";
import { pythonSnippet } from "./generators/python.js";

const GENERATORS = { curl: curlSnippet, fetch: fetchSnippet, node: nodeSnippet, python: pythonSnippet };

function render(language, outgoing) {
	const names = language === "all" ? Object.keys(GENERATORS) : [language];
	return names.map((name) => ({ language: name, code: GENERATORS[name](outgoing) }));
}

async function ensureWorkspace(workspaceId) {
	if (!mongoose.isValidObjectId(workspaceId) || !(await workspaceRepository.findById(workspaceId))) {
		throw new AppError(404, "WORKSPACE_NOT_FOUND", "The requested workspace does not exist.");
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

export const snippetService = {
	async generateSaved(requestId, { language, environmentId }) {
		if (!mongoose.isValidObjectId(requestId)) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		const request = await requestRepository.findById(requestId);
		if (!request) throw new AppError(404, "REQUEST_NOT_FOUND", "The requested request does not exist.");
		const collection = await collectionRepository.findById(request.collectionId);
		if (!collection) throw new AppError(404, "COLLECTION_NOT_FOUND", "The requested collection does not exist.");
		const environment = await loadEnvironment(collection.workspaceId, environmentId);
		const variables = buildVariableMap(environment?.variables);
		const resolved = resolveRequestParts(request, variables);
		resolved.auth = selectAuth(resolved.auth, collection.auth, variables);
		return { language, snippets: render(language, buildSnippetRequest(resolved, resolved.auth)) };
	},
	async generateInline(input) {
		let environment = null;
		if (input.workspaceId) {
			await ensureWorkspace(input.workspaceId);
			environment = await loadEnvironment(input.workspaceId, input.environmentId);
		}
		const variables = buildVariableMap(environment?.variables);
		const resolved = resolveRequestParts(input.request, variables);
		return { language: input.language, snippets: render(input.language, buildSnippetRequest(resolved, resolved.auth)) };
	},
};
