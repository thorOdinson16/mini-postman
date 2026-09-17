import { request } from "../../shared/api/client.js";

export const collectionApi = {
	list: (workspaceId) => request(`/collections?workspaceId=${workspaceId}`),
	create: (payload) => request("/collections", { method: "POST", body: JSON.stringify(payload) }),
	update: (id, payload) => request(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
	remove: (id) => request(`/collections/${id}`, { method: "DELETE" }),
};
