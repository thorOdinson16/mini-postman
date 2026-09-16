import { Request } from "./request.model.js";

export const requestRepository = {
	list: (collectionId, folderId) =>
		Request.find({ collectionId, ...(folderId !== undefined ? { folderId } : {}) })
			.sort({ folderId: 1, order: 1, name: 1 })
			.lean(),
	findById: (id) => Request.findById(id).lean(),
	countByCollection: (collectionId) => Request.countDocuments({ collectionId }),
	countByFolder: (collectionId, folderId) => Request.countDocuments({ collectionId, folderId }),
	maxOrder: async (collectionId, folderId) => {
		const top = await Request.findOne({ collectionId, folderId }).sort({ order: -1 }).lean();
		return top ? (top.order ?? 0) + 1 : 0;
	},
	create: (input) => Request.create(input),
	update: (id, input) => Request.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean(),
	remove: (id) => Request.findByIdAndDelete(id).lean(),
	deleteAll: () => Request.deleteMany({}),
	insertMany: (items) => Request.insertMany(items),
};
