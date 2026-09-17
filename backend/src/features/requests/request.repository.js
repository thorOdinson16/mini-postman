import { escapeRegex } from "../../shared/utils/regex.js";
import { Request } from "./request.model.js";

export const requestRepository = {
	list: (collectionId, folderId) =>
		Request.find({ collectionId, ...(folderId !== undefined ? { folderId } : {}) })
			.sort({ folderId: 1, order: 1, name: 1 })
			.lean(),
	findById: (id) => Request.findById(id).lean(),
	findByName: (name, collectionId, excludedId) =>
		Request.findOne({
			collectionId,
			name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
			...(excludedId ? { _id: { $ne: excludedId } } : {}),
		}).lean(),
	search: (filter, query, limit) =>
		Request.find({
			...filter,
			$or: [
				{ name: { $regex: escapeRegex(query), $options: "i" } },
				{ url: { $regex: escapeRegex(query), $options: "i" } },
				{ description: { $regex: escapeRegex(query), $options: "i" } },
			],
		})
			.sort({ collectionId: 1, folderId: 1, order: 1 })
			.limit(limit)
			.lean(),
	countByCollection: (collectionId) => Request.countDocuments({ collectionId }),
	countByFolder: (collectionId, folderId) => Request.countDocuments({ collectionId, folderId }),
	maxOrder: async (collectionId, folderId) => {
		const top = await Request.findOne({ collectionId, folderId }).sort({ order: -1 }).lean();
		return top ? (top.order ?? 0) + 1 : 0;
	},
	create: (input) => Request.create(input),
	update: (id, input) => Request.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean(),
	setOrders: (collectionId, folderId, pairs) =>
		Request.bulkWrite(
			pairs.map(({ requestId, order }) => ({
				updateOne: { filter: { _id: requestId, collectionId, folderId }, update: { $set: { order } } },
			})),
		),
	remove: (id) => Request.findByIdAndDelete(id).lean(),
	deleteAll: () => Request.deleteMany({}),
	insertMany: (items) => Request.insertMany(items),
};
