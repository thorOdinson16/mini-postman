import { HistoryEntry } from "./history-entry.model.js";

export const historyRepository = {
	list: (workspaceId) => HistoryEntry.find({ workspaceId }).sort({ sentAt: -1 }).lean(),
	findById: (id) => HistoryEntry.findById(id).lean(),
	create: (input) => HistoryEntry.create(input),
	remove: (id) => HistoryEntry.findByIdAndDelete(id).lean(),
	deleteAll: () => HistoryEntry.deleteMany({}),
	insertMany: (items) => HistoryEntry.insertMany(items),
};
