import { request } from "../../shared/api/client.js";

export const collectionApi = {
	list: (workspaceId) => request(`/collections?workspaceId=${workspaceId}`),
	create: (payload) => request("/collections", { method: "POST", body: JSON.stringify(payload) }),
	update: (id, payload) => request(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
	remove: (id) => request(`/collections/${id}`, { method: "DELETE" }),
	reorder: (workspaceId, collectionIds) => request("/collections/order", { method: "PUT", body: JSON.stringify({ workspaceId, collectionIds }) }),
	addFolder: (collectionId, payload) => request(`/collections/${collectionId}/folders`, { method: "POST", body: JSON.stringify(payload) }),
	renameFolder: (collectionId, folderId, payload) => request(`/collections/${collectionId}/folders/${folderId}`, { method: "PATCH", body: JSON.stringify(payload) }),
	removeFolder: (collectionId, folderId) => request(`/collections/${collectionId}/folders/${folderId}`, { method: "DELETE" }),
	reorderFolders: (collectionId, parentId, folderIds) => request(`/collections/${collectionId}/folders/order`, { method: "PUT", body: JSON.stringify({ parentId, folderIds }) }),
};
