import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { buildFolderTree } from "./collection-tree.js";

function FolderBranch({ expandedIds, onToggle, nodes }) {
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
						</div>
						{hasChildren && expanded && <FolderBranch expandedIds={expandedIds} nodes={children} onToggle={onToggle} />}
					</li>
				);
			})}
		</ul>
	);
}

export function CollectionTree({ collections, error, expandedIds, loading, onRetry, onSelect, onToggle, selectedId }) {
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
						</div>
						{hasFolders && expanded && <FolderBranch expandedIds={expandedIds} nodes={buildFolderTree(collection.folders)} onToggle={onToggle} />}
					</li>
				);
			})}
		</ul>
	);
}
