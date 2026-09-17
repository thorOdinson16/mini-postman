import { request } from "../../shared/api/client.js";

export const importExportApi = {
	export: (collectionId) => request(`/import-export/collections/${collectionId}`),
	import: (workspaceId, content) => request("/import-export/collections", { method: "POST", body: JSON.stringify({ workspaceId, content }) }),
};
