import { useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { OptionsMenu } from "./OptionsMenu.jsx";
import { buildFolderTree } from "./collection-tree.js";

function FolderBranch({ collection, expandedIds, nodes, onOpenMenu, onToggle }) {
	return (
		<ul className="folder-list">
			{nodes.map(({ folder, children }) => {
				const id = String(folder._id);
				const expanded = expandedIds.has(id);
				const hasChildren = children.length > 0;
				return (
					<li key={id}>
						<div className="tree-row folder-row">
							{hasChildren ? (
								<button className={`tree-toggle ${expanded ? "expanded" : ""}`} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`} onClick={() => onToggle(id)}><MaterialIcon size={18}>chevron_right</MaterialIcon></button>
							) : (
								<span className="tree-toggle-spacer" aria-hidden="true" />
							)}
							<span className="tree-name">{folder.name}</span>
							<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${folder.name}`} onClick={(event) => onOpenMenu(event, { key: `folder:${id}`, kind: "folder", collection, folder })}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
						</div>
						{hasChildren && expanded && <FolderBranch collection={collection} expandedIds={expandedIds} nodes={children} onOpenMenu={onOpenMenu} onToggle={onToggle} />}
					</li>
				);
			})}
		</ul>
	);
}

export function CollectionTree({ collections, error, expandedIds, loading, onDeleteCollection, onDeleteFolder, onNewFolder, onRenameCollection, onRenameFolder, onRetry, onSelect, onToggle, selectedId }) {
	const [menu, setMenu] = useState(null);
	const openMenu = (event, descriptor) => {
		const rectangle = event.currentTarget.getBoundingClientRect();
		setMenu((current) => (current?.key === descriptor.key ? null : { ...descriptor, position: { left: Math.min(rectangle.right + 8, window.innerWidth - 220), top: Math.max(8, Math.min(rectangle.bottom + 4, window.innerHeight - 170)) } }));
	};
	const collectionItems = (collection) => [
		{ icon: "add", label: "New folder", onSelect: () => onNewFolder(collection) },
		{ icon: "edit", label: "Rename", onSelect: () => onRenameCollection(collection) },
		{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteCollection(collection) },
	];
	const folderItems = (collection, folder) => [
		{ icon: "add", label: "New subfolder", onSelect: () => onNewFolder(collection, folder) },
		{ icon: "edit", label: "Rename", onSelect: () => onRenameFolder(collection, folder) },
		{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteFolder(collection, folder) },
	];
	if (loading) return <div className="collection-skeleton" aria-hidden="true"><span /><span /><span /></div>;
	if (error) return <div className="sidebar-error" role="alert"><span>{error}</span><button onClick={onRetry}>Try again</button></div>;
	if (!collections.length) return <p className="sidebar-empty">No collections yet</p>;
	return (
		<ul className="collection-list" aria-label="Collections">
			{collections.map((collection) => {
				const id = String(collection._id);
				const expanded = expandedIds.has(id);
				const hasFolders = collection.folders.length > 0;
				return (
					<li key={id}>
						<div className={`tree-row collection-row ${id === selectedId ? "active" : ""}`}>
							{hasFolders ? (
								<button className={`tree-toggle ${expanded ? "expanded" : ""}`} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${collection.name}`} onClick={() => onToggle(id)}><MaterialIcon size={18}>chevron_right</MaterialIcon></button>
							) : (
								<span className="tree-toggle-spacer" aria-hidden="true" />
							)}
							<button className="collection-select" aria-current={id === selectedId ? "true" : undefined} onClick={() => onSelect(id)}>
								<MaterialIcon size={18}>folder</MaterialIcon>
								<span className="tree-name">{collection.name}</span>
							</button>
							<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${collection.name}`} onClick={(event) => openMenu(event, { key: `collection:${id}`, kind: "collection", collection })}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
						</div>
						{hasFolders && expanded && <FolderBranch collection={collection} expandedIds={expandedIds} nodes={buildFolderTree(collection.folders)} onOpenMenu={openMenu} onToggle={onToggle} />}
					</li>
				);
			})}
			{menu && <OptionsMenu ariaLabel={`${menu.kind === "folder" ? menu.folder.name : menu.collection.name} options`} items={menu.kind === "folder" ? folderItems(menu.collection, menu.folder) : collectionItems(menu.collection)} onClose={() => setMenu(null)} position={menu.position} />}
		</ul>
	);
}
