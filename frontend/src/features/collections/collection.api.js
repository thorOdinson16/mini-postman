import { request } from "../../shared/api/client.js";

export const collectionApi = {
	list: (workspaceId) => request(`/collections?workspaceId=${workspaceId}`),
};
