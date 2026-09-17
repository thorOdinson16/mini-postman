import { HistoryEntry } from "./history-entry.model.js";

export const historyRepository = {
	list: (workspaceId, { environmentId, limit } = {}) =>
		HistoryEntry.find({ workspaceId, ...(environmentId ? { environmentId } : {}) })
			.sort({ sentAt: -1 })
			.limit(limit)
			.lean(),
	findById: (id) => HistoryEntry.findById(id).lean(),
	create: (input) => HistoryEntry.create(input),
	remove: (id) => HistoryEntry.findByIdAndDelete(id).lean(),
	removeByWorkspace: (workspaceId) => HistoryEntry.deleteMany({ workspaceId }),
	clearEnvironment: (workspaceId, environmentId) => HistoryEntry.updateMany({ workspaceId, environmentId }, { $set: { environmentId: null } }),
};
