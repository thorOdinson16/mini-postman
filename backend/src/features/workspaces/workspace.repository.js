import { Workspace } from "./workspace.model.js";

export const workspaceRepository = {
	list: () => Workspace.find({}).sort({ isDefault: -1, name: 1 }).lean(),
	findById: (id) => Workspace.findById(id).lean(),
	findByName: (name, excludedId) =>
		Workspace.findOne({
			name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
			...(excludedId ? { _id: { $ne: excludedId } } : {}),
		}).lean(),
	findOldestExcluding: (id) => Workspace.findOne({ _id: { $ne: id } }).sort({ createdAt: 1 }).lean(),
	count: () => Workspace.countDocuments(),
	create: (input) => Workspace.create(input),
	update: (id, input) => Workspace.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean(),
	clearDefault: (excludedId) => Workspace.updateMany({ _id: { $ne: excludedId }, isDefault: true }, { $set: { isDefault: false } }),
	remove: (id) => Workspace.findByIdAndDelete(id).lean(),
};
