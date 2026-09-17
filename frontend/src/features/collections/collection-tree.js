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
