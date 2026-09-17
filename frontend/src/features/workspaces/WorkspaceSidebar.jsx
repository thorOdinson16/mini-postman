import { useRef } from "react";
import { CollectionTree } from "../collections/CollectionTree.jsx";
import { HistoryList } from "../history/HistoryList.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function WorkspaceSidebar({ activeTab, collections, collectionsError, collectionsLoading, expandedIds, history, historyError, historyLoading, loading, onApplyCollectionOrder, onApplyFolderOrder, onClearHistory, onDeleteCollection, onDeleteFolder, onDismissTransferError, onDuplicateCollection, onExportCollection, onImportFile, onNewCollection, onNewFolder, onRenameCollection, onRenameFolder, onRetryCollections, onRetryHistory, onSelect, onSelectCollection, onSelectHistory, onSelectRequest, onTabChange, onToggleCollection, requestsByCollection, requestsLoading, selectedCollectionId, selectedHistoryId, selectedId, selectedRequestId, transferError, workspaces }) {
	const fileInputReference = useRef(null);
	return (
		<aside className="sidebar">
			<div className="sidebar-inner">
				<div className="sidebar-tabs" role="tablist" aria-label="Sidebar sections">
					<button type="button" role="tab" aria-selected={activeTab === "collections"} className={activeTab === "collections" ? "active" : ""} onClick={() => onTabChange("collections")}>Collections</button>
					<button type="button" role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => onTabChange("history")}>History</button>
				</div>
				{activeTab === "history" ? (
					<HistoryList entries={history} error={historyError} loading={historyLoading} onClear={onClearHistory} onRetry={onRetryHistory} onSelect={onSelectHistory} selectedId={selectedHistoryId} />
				) : (
					<>
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
								type="file"
								accept=".json,application/json"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file) onImportFile(file);
								}}
							/>
							{transferError && <div className="sidebar-error" role="alert"><span>{transferError}</span><button onClick={onDismissTransferError}>Dismiss</button></div>}
							<CollectionTree
								collections={collections}
								error={collectionsError}
								expandedIds={expandedIds}
								loading={collectionsLoading}
								onApplyCollectionOrder={onApplyCollectionOrder}
								onApplyFolderOrder={onApplyFolderOrder}
								onDeleteCollection={onDeleteCollection}
								onDeleteFolder={onDeleteFolder}
								onDuplicateCollection={onDuplicateCollection}
								onExportCollection={onExportCollection}
								onNewFolder={onNewFolder}
								onRenameCollection={onRenameCollection}
								onRenameFolder={onRenameFolder}
								onRetry={onRetryCollections}
								onSelect={onSelectCollection}
								onSelectRequest={onSelectRequest}
								onToggle={onToggleCollection}
								requestsByCollection={requestsByCollection}
								requestsLoading={requestsLoading}
								selectedId={selectedCollectionId}
								selectedRequestId={selectedRequestId}
							/>
						</div>
					</>
				)}
			</div>
		</aside>
	);
}
