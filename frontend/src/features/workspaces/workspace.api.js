import { request } from "../../shared/api/client.js";

export const workspaceApi = {
	list: () => request("/workspaces"),
	create: (payload) => request("/workspaces", { method: "POST", body: JSON.stringify(payload) }),
	update: (id, payload) => request(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
	remove: (id) => request(`/workspaces/${id}`, { method: "DELETE" }),
};
