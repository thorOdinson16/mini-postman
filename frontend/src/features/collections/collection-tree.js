export function buildFolderTree(folders = []) {
	const nodes = new Map();
	for (const folder of folders) nodes.set(String(folder._id), { folder, children: [] });
	const roots = [];
	for (const node of nodes.values()) {
		const parentId = node.folder.parentId ? String(node.folder.parentId) : null;
		const parent = parentId ? nodes.get(parentId) : null;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}
	const byOrder = (left, right) => (left.folder.order ?? 0) - (right.folder.order ?? 0);
	const sort = (list) => {
		list.sort(byOrder);
		for (const node of list) sort(node.children);
		return list;
	};
	return sort(roots);
}

export function siblingsOf(folders = [], parentId = null) {
	const target = parentId ? String(parentId) : null;
	return folders
		.filter((folder) => (folder.parentId ? String(folder.parentId) : null) === target)
		.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function moveInList(ids, id, direction) {
	const index = ids.indexOf(id);
	const target = index + direction;
	if (index === -1 || target < 0 || target >= ids.length) return null;
	const next = [...ids];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

export function reorderIds(ids, draggedId, targetId, position) {
	const next = ids.filter((value) => value !== draggedId);
	const index = next.indexOf(targetId);
	if (index === -1) return null;
	next.splice(position === "after" ? index + 1 : index, 0, draggedId);
	return next;
}
