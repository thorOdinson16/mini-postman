import { request } from "../../shared/api/client.js";

export const requestApi = {
	list: (collectionId) => request(`/requests?collectionId=${collectionId}`),
	get: (id) => request(`/requests/${id}`),
	update: (id, payload) => request(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
