import { Environment } from "./environment.model.js";

export const environmentRepository = {
	list: (workspaceId) => Environment.find({ workspaceId }).sort({ isActive: -1, name: 1 }).lean(),
	findById: (id) => Environment.findById(id).lean(),
	findByName: (name, workspaceId, excludedId) =>
		Environment.findOne({
			workspaceId,
			name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
			...(excludedId ? { _id: { $ne: excludedId } } : {}),
		}).lean(),
	findActive: (workspaceId) => Environment.findOne({ workspaceId, isActive: true }).lean(),
	countByWorkspace: (workspaceId) => Environment.countDocuments({ workspaceId }),
	create: (input) => Environment.create(input),
	update: (id, input) => Environment.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean(),
	clearActive: (workspaceId, excludedId) =>
		Environment.updateMany({ workspaceId, _id: { $ne: excludedId }, isActive: true }, { $set: { isActive: false } }),
	remove: (id) => Environment.findByIdAndDelete(id).lean(),
	removeByWorkspace: (workspaceId) => Environment.deleteMany({ workspaceId }),
	deleteAll: () => Environment.deleteMany({}),
	insertMany: (items) => Environment.insertMany(items),
};
