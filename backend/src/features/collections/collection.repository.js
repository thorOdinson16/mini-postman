import { escapeRegex } from "../../shared/utils/regex.js";
import { Collection } from "./collection.model.js";

export const collectionRepository = {
	list: (workspaceId) => Collection.find({ workspaceId }).sort({ order: 1, name: 1 }).lean(),
	listIdsByWorkspace: (workspaceId) => Collection.find({ workspaceId }, { _id: 1 }).lean(),
	findById: (id) => Collection.findById(id).lean(),
	findByName: (name, workspaceId, excludedId) =>
		Collection.findOne({
			workspaceId,
			name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
			...(excludedId ? { _id: { $ne: excludedId } } : {}),
		}).lean(),
	search: (workspaceId, query, limit) =>
		Collection.find({
			workspaceId,
			$or: [
				{ name: { $regex: escapeRegex(query), $options: "i" } },
				{ description: { $regex: escapeRegex(query), $options: "i" } },
			],
		})
			.sort({ order: 1, name: 1 })
			.limit(limit)
			.lean(),
	countByWorkspace: (workspaceId) => Collection.countDocuments({ workspaceId }),
	create: (input) => Collection.create(input),
	update: (id, input) => Collection.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean(),
	addFolder: (collectionId, folder) => Collection.findByIdAndUpdate(collectionId, { $push: { folders: folder } }, { new: true, runValidators: true }).lean(),
	renameFolder: (collectionId, folderId, name) =>
		Collection.findOneAndUpdate(
			{ _id: collectionId, "folders._id": folderId },
			{ $set: { "folders.$.name": name } },
			{ new: true, runValidators: true },
		).lean(),
	removeFolder: (collectionId, folderId) => Collection.findByIdAndUpdate(collectionId, { $pull: { folders: { _id: folderId } } }, { new: true }).lean(),
	setFolderOrders: (collectionId, pairs) =>
		Collection.bulkWrite(
			pairs.map(({ folderId, order }) => ({
				updateOne: { filter: { _id: collectionId, "folders._id": folderId }, update: { $set: { "folders.$.order": order } } },
			})),
		),
	setOrders: (workspaceId, pairs) =>
		Collection.bulkWrite(
			pairs.map(({ collectionId, order }) => ({
				updateOne: { filter: { _id: collectionId, workspaceId }, update: { $set: { order } } },
			})),
		),
	remove: (id) => Collection.findByIdAndDelete(id).lean(),
	removeByWorkspace: (workspaceId) => Collection.deleteMany({ workspaceId }),
};
