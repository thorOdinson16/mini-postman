import { request } from "../../shared/api/client.js";

export const environmentApi = {
	list: (workspaceId) => request(`/environments?workspaceId=${workspaceId}`),
	create: (payload) => request("/environments", { method: "POST", body: JSON.stringify(payload) }),
	update: (id, payload) => request(`/environments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
	remove: (id) => request(`/environments/${id}`, { method: "DELETE" }),
};
