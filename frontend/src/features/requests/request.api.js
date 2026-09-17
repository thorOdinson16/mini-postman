import { request } from "../../shared/api/client.js";

export const requestApi = {
	list: (collectionId) => request(`/requests?collectionId=${collectionId}`),
	create: (payload) => request("/requests", { method: "POST", body: JSON.stringify(payload) }),
	update: (id, payload) => request(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
	remove: (id) => request(`/requests/${id}`, { method: "DELETE" }),
	duplicate: (id, payload = {}) => request(`/requests/${id}/duplicate`, { method: "POST", body: JSON.stringify(payload) }),
	search: (workspaceId, q) => request(`/requests/search?workspaceId=${workspaceId}&q=${encodeURIComponent(q)}`),
	send: (id) => request(`/requests/${id}/send`, { method: "POST" }),
};
