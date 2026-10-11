import { z } from "zod";
import { importExportService } from "./import-export.service.js";
import { objectId } from "../../shared/validation/common.js";

const importSchema = z.object({
	workspaceId: objectId,
	content: z.record(z.string(), z.unknown()),
});

export async function exportCollection(request, response, next) {
	try {
		response.json({ data: await importExportService.exportCollection(request.params.collectionId) });
	} catch (error) {
		next(error);
	}
}

export async function importCollection(request, response, next) {
	try {
		const { workspaceId, content } = importSchema.parse(request.body);
		response.status(201).json({ data: await importExportService.importCollection(workspaceId, content) });
	} catch (error) {
		next(error);
	}
}
