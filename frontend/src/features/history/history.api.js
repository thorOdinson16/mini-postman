import { request } from "../../shared/api/client.js";

export const historyApi = {
	list: (workspaceId) => request(`/history?workspaceId=${workspaceId}&limit=50`),
	remove: (id) => request(`/history/${id}`, { method: "DELETE" }),
	clear: (workspaceId) => request(`/history?workspaceId=${workspaceId}`, { method: "DELETE" }),
	replay: (id) => request(`/history/${id}/replay`, { method: "POST" }),
	save: (id, payload) => request(`/history/${id}/save`, { method: "POST", body: JSON.stringify(payload) }),
};
