import { request } from "../../shared/api/client.js";

export const snippetsApi = {
	forRequest: (id) => request(`/snippets/${id}?language=all`),
	forPayload: (payload) => request("/snippets", { method: "POST", body: JSON.stringify({ request: payload, language: "all" }) }),
};
