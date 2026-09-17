import { request } from "../../shared/api/client.js";

export const workspaceApi = {
	list: () => request("/workspaces"),
};
