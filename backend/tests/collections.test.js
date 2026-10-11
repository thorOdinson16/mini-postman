import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { collectionService } from "../src/features/collections/collection.service.js";
import { requestRepository } from "../src/features/requests/request.repository.js";
import { workspaceService } from "../src/features/workspaces/workspace.service.js";
import { closeTestDatabase, openTestDatabase } from "./helpers/database.js";

async function rejection(promise) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	return null;
}

beforeAll(openTestDatabase);
afterAll(closeTestDatabase);

describe("duplicate names", () => {
	test("a workspace name cannot be reused, ignoring case", async () => {
		await workspaceService.create({ name: "Platform" });
		const error = await rejection(workspaceService.create({ name: "platform" }));
		expect(error?.statusCode).toBe(409);
		expect(error?.code).toBe("WORKSPACE_NAME_CONFLICT");
	});

	test("a collection name is unique within a workspace but reusable in another", async () => {
		const first = await workspaceService.create({ name: "Billing" });
		const second = await workspaceService.create({ name: "Support" });
		await collectionService.create({ workspaceId: first._id, name: "Invoices" });
		const error = await rejection(collectionService.create({ workspaceId: first._id, name: "invoices" }));
		expect(error?.code).toBe("COLLECTION_NAME_CONFLICT");
		const other = await collectionService.create({ workspaceId: second._id, name: "Invoices" });
		expect(other.name).toBe("Invoices");
	});

	test("a sibling folder name cannot be reused", async () => {
		const workspace = await workspaceService.create({ name: "Folders" });
		const collection = await collectionService.create({ workspaceId: workspace._id, name: "API" });
		await collectionService.addFolder(collection._id, { name: "Users" });
		const error = await rejection(collectionService.addFolder(collection._id, { name: "users" }));
		expect(error?.code).toBe("FOLDER_NAME_CONFLICT");
	});
});

describe("folder deletion guard", () => {
	async function createFolder(workspaceName) {
		const workspace = await workspaceService.create({ name: workspaceName });
		const collection = await collectionService.create({ workspaceId: workspace._id, name: "API" });
		const withFolder = await collectionService.addFolder(collection._id, { name: "Parent" });
		return { collection, parent: withFolder.folders[0] };
	}

	test("refuses to delete a folder that has a subfolder", async () => {
		const { collection, parent } = await createFolder("Guard subfolders");
		await collectionService.addFolder(collection._id, { name: "Child", parentId: parent._id });
		const error = await rejection(collectionService.removeFolder(collection._id, parent._id));
		expect(error?.statusCode).toBe(409);
		expect(error?.code).toBe("FOLDER_NOT_EMPTY");
	});

	test("refuses to delete a folder that has requests, then allows it once empty", async () => {
		const { collection, parent } = await createFolder("Guard requests");
		await requestRepository.create({ collectionId: collection._id, folderId: parent._id, name: "List", method: "GET", url: "https://example.com" });
		const error = await rejection(collectionService.removeFolder(collection._id, parent._id));
		expect(error?.statusCode).toBe(409);
		expect(error?.code).toBe("FOLDER_NOT_EMPTY");
		await requestRepository.deleteByCollection(collection._id);
		const updated = await collectionService.removeFolder(collection._id, parent._id);
		expect(updated.folders).toHaveLength(0);
	});
});
