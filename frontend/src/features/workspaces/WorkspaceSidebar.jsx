import { useRef, useState } from "react";
import { CollectionTree } from "../collections/CollectionTree.jsx";
import { SearchPanel } from "../collections/SearchPanel.jsx";
import { HistoryList } from "../history/HistoryList.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { OptionsMenu } from "../../shared/components/OptionsMenu.jsx";
import { createTabList } from "../../shared/utils/a11y.js";

export function WorkspaceSidebar({ activeTab, collections, collectionsError, collectionsLoading, expandedIds, history, historyError, historyLoading, loading, onApplyCollectionOrder, onApplyFolderOrder, onClearHistory, onDeleteCollection, onDeleteFolder, onDeleteRequest, onDeleteWorkspace, onDismissTransferError, onDuplicateCollection, onDuplicateRequest, onExportCollection, onImportFile, onNewCollection, onNewFolder, onNewRequest, onNewWorkspace, onRenameCollection, onRenameFolder, onRenameWorkspace, onRetryCollections, onRetryHistory, onRetryRequests, onSelect, onSelectCollection, onSelectHistory, onSelectRequest, onSetDefaultWorkspace, onTabChange, onToggleCollection, requestsByCollection, requestsError, requestsLoading, selectedCollectionId, selectedHistoryId, selectedId, selectedRequestId, transferError, workspaces }) {
	const fileInputReference = useRef(null);
	const tabReference = useRef(null);
	const tabs = createTabList({ ids: ["collections", "history"], activeId: activeTab, onChange: onTabChange, ariaLabel: "Sidebar sections", idPrefix: "sidebar", listRef: tabReference });
	const [workspaceMenu, setWorkspaceMenu] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const searchActive = searchQuery.trim().length > 0;
	const openWorkspaceMenu = (event, workspace) => {
		const rectangle = event.currentTarget.getBoundingClientRect();
		setWorkspaceMenu((current) => (current?.workspace._id === workspace._id ? null : { workspace, position: { left: Math.min(rectangle.right + 8, window.innerWidth - 220), top: Math.max(8, Math.min(rectangle.bottom + 4, window.innerHeight - 170)) } }));
	};
	const workspaceItems = (workspace) => [
		{ icon: "edit", label: "Rename", onSelect: () => onRenameWorkspace(workspace) },
		{ icon: "check_circle", label: "Set as default", disabled: workspace.isDefault, onSelect: () => onSetDefaultWorkspace(workspace) },
		{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteWorkspace(workspace) },
	];
	return (
		<aside className="sidebar">
			<div className="sidebar-inner">
				<div className="sidebar-tabs" {...tabs.listProps}>
					<button type="button" {...tabs.tabProps("collections")} className={activeTab === "collections" ? "active" : ""} onClick={() => onTabChange("collections")}>Collections</button>
					<button type="button" {...tabs.tabProps("history")} className={activeTab === "history" ? "active" : ""} onClick={() => onTabChange("history")}>History</button>
				</div>
				<div className="sidebar-panel" {...tabs.panelProps(activeTab)}>
				{activeTab === "history" ? (
					<HistoryList entries={history} error={historyError} loading={historyLoading} onClear={onClearHistory} onRetry={onRetryHistory} onSelect={onSelectHistory} selectedId={selectedHistoryId} />
				) : (
					<>
						<div className="sidebar-section">
							<div className="sidebar-section-heading">
								<p className="sidebar-label">Workspace</p>
								<div className="sidebar-section-actions">
									<button className="icon-button sidebar-add" aria-label="New workspace" title="New workspace" onClick={onNewWorkspace}><MaterialIcon size={18}>add</MaterialIcon></button>
								</div>
							</div>
							{loading ? (
								<div className="sidebar-skeleton" aria-hidden="true"><span /><span /><span /></div>
							) : workspaces.length ? (
								<ul className="workspace-list" aria-label="Workspaces">
									{workspaces.map((workspace) => (
										<li key={workspace._id}>
											<div className={`tree-row workspace-row ${workspace._id === selectedId ? "active" : ""}`}>
												<button className="workspace-option" aria-current={workspace._id === selectedId ? "true" : undefined} onClick={() => onSelect(workspace._id)}>
													<span className="workspace-option-initial">{workspace.name.slice(0, 1).toUpperCase()}</span>
													<span className="workspace-option-name">{workspace.name}</span>
												</button>
												<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${workspace.name}`} onClick={(event) => openWorkspaceMenu(event, workspace)}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
											</div>
										</li>
									))}
								</ul>
							) : (
								<p className="sidebar-empty">No workspaces yet</p>
							)}
							{workspaceMenu && <OptionsMenu ariaLabel={`${workspaceMenu.workspace.name} options`} items={workspaceItems(workspaceMenu.workspace)} onClose={() => setWorkspaceMenu(null)} position={workspaceMenu.position} />}
						</div>
						<div className="sidebar-section">
							<div className="sidebar-section-heading">
								<p className="sidebar-label">Collections</p>
								<div className="sidebar-section-actions">
									<button className="icon-button sidebar-add" aria-label="Import collection" title="Import collection" onClick={() => fileInputReference.current?.click()}><MaterialIcon size={18}>upload</MaterialIcon></button>
									<button className="icon-button sidebar-add" aria-label="New collection" title="New collection" onClick={onNewCollection}><MaterialIcon size={18}>add</MaterialIcon></button>
								</div>
							</div>
							<input
								ref={fileInputReference}
								className="sr-only"
								tabIndex={-1}
								aria-hidden="true"
								type="file"
								accept=".json,application/json"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file) onImportFile(file);
								}}
							/>
							<div className="sidebar-search">
								<MaterialIcon size={16}>search</MaterialIcon>
								<input aria-label="Search collections and requests" placeholder="Search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
								{searchActive && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")}><MaterialIcon size={16}>close</MaterialIcon></button>}
							</div>
							{transferError && <div className="sidebar-error" role="alert"><span>{transferError}</span><button onClick={onDismissTransferError}>Dismiss</button></div>}
							{searchActive ? (
								<SearchPanel
									query={searchQuery}
									workspaceId={selectedId}
									onSelectCollection={(id) => { setSearchQuery(""); onSelectCollection(id); }}
									onSelectRequest={(collectionId, requestId) => { setSearchQuery(""); onSelectRequest(collectionId, requestId); }}
								/>
							) : (
								<CollectionTree
									collections={collections}
									error={collectionsError}
									expandedIds={expandedIds}
									loading={collectionsLoading}
									onApplyCollectionOrder={onApplyCollectionOrder}
									onApplyFolderOrder={onApplyFolderOrder}
									onDeleteCollection={onDeleteCollection}
									onDeleteFolder={onDeleteFolder}
									onDeleteRequest={onDeleteRequest}
									onDuplicateCollection={onDuplicateCollection}
									onDuplicateRequest={onDuplicateRequest}
									onExportCollection={onExportCollection}
									onNewFolder={onNewFolder}
									onNewRequest={onNewRequest}
									onRenameCollection={onRenameCollection}
									onRenameFolder={onRenameFolder}
									onRetry={onRetryCollections}
									onRetryRequests={onRetryRequests}
									onSelect={onSelectCollection}
									onSelectRequest={onSelectRequest}
									onToggle={onToggleCollection}
									requestsByCollection={requestsByCollection}
									requestsError={requestsError}
									requestsLoading={requestsLoading}
									selectedId={selectedCollectionId}
									selectedRequestId={selectedRequestId}
								/>
							)}
						</div>
					</>
				)}
				</div>
			</div>
		</aside>
	);
}
