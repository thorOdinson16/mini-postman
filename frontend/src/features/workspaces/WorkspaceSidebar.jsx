import { CollectionTree } from "../collections/CollectionTree.jsx";

export function WorkspaceSidebar({ collections, collectionsError, collectionsLoading, expandedIds, loading, onRetryCollections, onSelect, onSelectCollection, onToggleCollection, selectedCollectionId, selectedId, workspaces }) {
	return (
		<aside className="sidebar">
			<div className="sidebar-inner">
				<div className="sidebar-section">
					<p className="sidebar-label">Workspace</p>
					{loading ? (
						<div className="sidebar-skeleton" aria-hidden="true"><span /><span /><span /></div>
					) : workspaces.length ? (
						<ul className="workspace-list" aria-label="Workspaces">
							{workspaces.map((workspace) => (
								<li key={workspace._id}>
									<button className={`workspace-option ${workspace._id === selectedId ? "active" : ""}`} aria-current={workspace._id === selectedId ? "true" : undefined} onClick={() => onSelect(workspace._id)}>
										<span className="workspace-option-initial">{workspace.name.slice(0, 1).toUpperCase()}</span>
										<span className="workspace-option-name">{workspace.name}</span>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="sidebar-empty">No workspaces yet</p>
					)}
				</div>
				<div className="sidebar-section">
					<p className="sidebar-label">Collections</p>
					<CollectionTree collections={collections} error={collectionsError} expandedIds={expandedIds} loading={collectionsLoading} onRetry={onRetryCollections} onSelect={onSelectCollection} onToggle={onToggleCollection} selectedId={selectedCollectionId} />
				</div>
			</div>
		</aside>
	);
}
