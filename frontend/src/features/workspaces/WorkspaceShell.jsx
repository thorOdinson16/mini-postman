import { useCallback, useEffect, useRef, useState } from "react";
import { collectionApi } from "../collections/collection.api.js";
import { CollectionEditor } from "../collections/CollectionEditor.jsx";
import { environmentApi } from "../environments/environment.api.js";
import { EnvironmentManager } from "../environments/EnvironmentManager.jsx";
import { historyApi } from "../history/history.api.js";
import { importExportApi } from "../import-export/import-export.api.js";
import { HistoryDetail } from "../history/HistoryDetail.jsx";
import { SaveToCollectionDialog } from "../history/SaveToCollectionDialog.jsx";
import { requestApi } from "../requests/request.api.js";
import { RequestEditor } from "../requests/RequestEditor.jsx";
import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { WorkspaceHeader } from "./WorkspaceHeader.jsx";
import { WorkspaceSidebar } from "./WorkspaceSidebar.jsx";
import { workspaceApi } from "./workspace.api.js";

export function WorkspaceShell({ account, onLogout }) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
		const stored = localStorage.getItem("postman-sidebar");
		if (stored) return stored === "collapsed";
		return window.matchMedia?.("(max-width: 840px)").matches ?? false;
	});
	const [workspaces, setWorkspaces] = useState([]);
	const [selectedId, setSelectedId] = useState(() => localStorage.getItem("postman-workspace-id") || "");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [collections, setCollections] = useState([]);
	const [collectionsLoading, setCollectionsLoading] = useState(false);
	const [collectionsError, setCollectionsError] = useState("");
	const [selectedCollectionId, setSelectedCollectionId] = useState(() => localStorage.getItem("postman-collection-id") || "");
	const [requestsByCollection, setRequestsByCollection] = useState({});
	const [requestsLoading, setRequestsLoading] = useState({});
	const [selectedRequestId, setSelectedRequestId] = useState("");
	const [environments, setEnvironments] = useState([]);
	const [environmentsError, setEnvironmentsError] = useState("");
	const [environmentManager, setEnvironmentManager] = useState(null);
	const [sidebarTab, setSidebarTab] = useState("collections");
	const [history, setHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState("");
	const [selectedHistoryId, setSelectedHistoryId] = useState("");
	const [historyDeleting, setHistoryDeleting] = useState(null);
	const [historyClearOpen, setHistoryClearOpen] = useState(false);
	const [historySaving, setHistorySaving] = useState(null);
	const [historyBusy, setHistoryBusy] = useState(false);
	const [historyActionError, setHistoryActionError] = useState("");
	const [replaying, setReplaying] = useState(false);
	const [transferError, setTransferError] = useState("");
	const loadedCollections = useRef(new Set());
	const [expandedIds, setExpandedIds] = useState(() => new Set());
	const [editor, setEditor] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const loadWorkspaces = useCallback(async () => {
		try {
			setError("");
			const list = await workspaceApi.list();
			setWorkspaces(list);
			setSelectedId((current) => (current && list.some((workspace) => workspace._id === current) ? current : list[0]?._id || ""));
		} catch (requestError) {
			setError(requestError.message);
			setWorkspaces([]);
		} finally {
			setLoading(false);
		}
	}, []);
	const loadCollections = useCallback(async (workspaceId) => {
		if (!workspaceId) {
			setCollections([]);
			setCollectionsError("");
			setCollectionsLoading(false);
			return [];
		}
		try {
			setCollectionsError("");
			setCollectionsLoading(true);
			const list = await collectionApi.list(workspaceId);
			setCollections(list);
			setSelectedCollectionId((current) => (current && list.some((collection) => String(collection._id) === String(current)) ? current : ""));
			return list;
		} catch (requestError) {
			setCollectionsError(requestError.message);
			setCollections([]);
			setSelectedCollectionId("");
			return [];
		} finally {
			setCollectionsLoading(false);
		}
	}, []);
	useEffect(() => {
		loadWorkspaces();
	}, [loadWorkspaces]);
	const loadRequests = useCallback(async (collectionId, force = false) => {
		if (!collectionId) return;
		if (!force && loadedCollections.current.has(collectionId)) return;
		loadedCollections.current.add(collectionId);
		setRequestsLoading((current) => ({ ...current, [collectionId]: true }));
		try {
			const list = await requestApi.list(collectionId);
			setRequestsByCollection((current) => ({ ...current, [collectionId]: list }));
		} catch {
			loadedCollections.current.delete(collectionId);
			setRequestsByCollection((current) => ({ ...current, [collectionId]: [] }));
		} finally {
			setRequestsLoading((current) => ({ ...current, [collectionId]: false }));
		}
	}, []);
	const loadEnvironments = useCallback(async (workspaceId) => {
		if (!workspaceId) {
			setEnvironments([]);
			setEnvironmentsError("");
			return [];
		}
		try {
			setEnvironmentsError("");
			const list = await environmentApi.list(workspaceId);
			setEnvironments(list);
			return list;
		} catch (environmentError) {
			setEnvironmentsError(environmentError.message);
			setEnvironments([]);
			return [];
		}
	}, []);
	const loadHistory = useCallback(async (workspaceId) => {
		if (!workspaceId) {
			setHistory([]);
			setHistoryError("");
			setHistoryLoading(false);
			return [];
		}
		try {
			setHistoryError("");
			setHistoryLoading(true);
			const list = await historyApi.list(workspaceId);
			setHistory(list);
			return list;
		} catch (historyLoadError) {
			setHistoryError(historyLoadError.message);
			setHistory([]);
			return [];
		} finally {
			setHistoryLoading(false);
		}
	}, []);
	useEffect(() => {
		setExpandedIds(new Set());
		loadedCollections.current = new Set();
		setRequestsByCollection({});
		setRequestsLoading({});
		setSelectedRequestId("");
		setSelectedHistoryId("");
		setSidebarTab("collections");
		loadCollections(selectedId);
		loadEnvironments(selectedId);
		loadHistory(selectedId);
	}, [selectedId, loadCollections, loadEnvironments, loadHistory]);
	useEffect(() => {
		if (selectedId) localStorage.setItem("postman-workspace-id", selectedId);
		else localStorage.removeItem("postman-workspace-id");
	}, [selectedId]);
	useEffect(() => {
		if (selectedCollectionId) localStorage.setItem("postman-collection-id", selectedCollectionId);
		else localStorage.removeItem("postman-collection-id");
	}, [selectedCollectionId]);
	const toggleSidebar = () => {
		const next = !sidebarCollapsed;
		setSidebarCollapsed(next);
		localStorage.setItem("postman-sidebar", next ? "collapsed" : "expanded");
	};
	const toggleCollection = (id) => {
		const willExpand = !expandedIds.has(id);
		const isCollection = collections.some((collection) => String(collection._id) === String(id));
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		if (willExpand && isCollection) loadRequests(id);
	};
	const activeEnvironment = environments.find((environment) => environment.isActive) || null;
	const activateEnvironment = async (id) => {
		try {
			setEnvironmentsError("");
			if (id) await environmentApi.update(id, { isActive: true });
			else if (activeEnvironment) await environmentApi.update(activeEnvironment._id, { isActive: false });
			await loadEnvironments(selectedId);
		} catch (environmentError) {
			setEnvironmentsError(environmentError.message);
		}
	};
	const createEnvironment = async (values) => {
		await environmentApi.create({ workspaceId: selectedId, ...values });
		await loadEnvironments(selectedId);
	};
	const updateEnvironment = async (id, values) => {
		await environmentApi.update(id, values);
		await loadEnvironments(selectedId);
	};
	const deleteEnvironment = async (id) => {
		await environmentApi.remove(id);
		await loadEnvironments(selectedId);
	};
	const selectRequest = (collectionId, requestId) => {
		setSelectedCollectionId(collectionId);
		setSelectedRequestId(requestId);
		setSelectedHistoryId("");
	};
	const selectHistory = (id) => {
		setSelectedHistoryId(id);
		setSelectedRequestId("");
	};
	const replayHistory = async (entry) => {
		try {
			setReplaying(true);
			setHistoryError("");
			const result = await historyApi.replay(entry._id);
			await loadHistory(selectedId);
			setSelectedHistoryId(String(result.historyId));
		} catch (replayError) {
			setHistoryError(replayError.message);
		} finally {
			setReplaying(false);
		}
	};
	const saveHistory = async (entry, payload) => {
		const created = await historyApi.save(entry._id, payload);
		await loadCollections(selectedId);
		await loadRequests(created.collectionId, true);
		setSelectedCollectionId(String(created.collectionId));
		setSelectedRequestId(String(created._id));
		setSelectedHistoryId("");
		setSidebarTab("collections");
		setExpandedIds((current) => {
			const next = new Set(current);
			next.add(String(created.collectionId));
			if (created.folderId) next.add(String(created.folderId));
			return next;
		});
		setHistorySaving(null);
	};
	const confirmDeleteHistory = async () => {
		try {
			setHistoryBusy(true);
			setHistoryActionError("");
			await historyApi.remove(historyDeleting._id);
			await loadHistory(selectedId);
			if (String(selectedHistoryId) === String(historyDeleting._id)) setSelectedHistoryId("");
			setHistoryDeleting(null);
		} catch (historyDeleteError) {
			setHistoryActionError(historyDeleteError.message);
		} finally {
			setHistoryBusy(false);
		}
	};
	const confirmClearHistory = async () => {
		try {
			setHistoryBusy(true);
			setHistoryActionError("");
			await historyApi.clear(selectedId);
			await loadHistory(selectedId);
			setSelectedHistoryId("");
			setHistoryClearOpen(false);
		} catch (historyClearError) {
			setHistoryActionError(historyClearError.message);
		} finally {
			setHistoryBusy(false);
		}
	};
	const saveRequest = async (requestItem, payload) => {
		const updated = await requestApi.update(requestItem._id, payload);
		await loadRequests(requestItem.collectionId, true);
		setSelectedRequestId(String(updated._id));
	};
	const openNewCollection = () => setEditor({ kind: "collection", mode: "create" });
	const openNewFolder = (collection, parent = null) => setEditor({ kind: "folder", mode: "create", collectionId: collection._id, parentId: parent?._id ?? null, parentName: parent?.name ?? collection.name });
	const openRenameCollection = (collection) => setEditor({ kind: "collection", mode: "edit", collection });
	const openRenameFolder = (collection, folder) => setEditor({ kind: "folder", mode: "edit", collectionId: collection._id, folder, parentName: collection.name });
	const requestDeleteCollection = (collection) => {
		setDeleteError("");
		setDeleting({ kind: "collection", collection });
	};
	const requestDeleteFolder = (collection, folder) => {
		setDeleteError("");
		setDeleting({ kind: "folder", collectionId: collection._id, folder });
	};
	const saveEditor = async (values) => {
		if (editor.kind === "folder") {
			if (editor.mode === "edit") {
				await collectionApi.renameFolder(editor.collectionId, editor.folder._id, { name: values.name });
				await loadCollections(selectedId);
			} else {
				await collectionApi.addFolder(editor.collectionId, { name: values.name, parentId: editor.parentId });
				setExpandedIds((current) => {
					const next = new Set(current);
					next.add(String(editor.collectionId));
					if (editor.parentId) next.add(String(editor.parentId));
					return next;
				});
				await loadCollections(selectedId);
			}
		} else if (editor.mode === "edit") {
			await collectionApi.update(editor.collection._id, values);
			await loadCollections(selectedId);
		} else {
			const created = await collectionApi.create({ workspaceId: selectedId, ...values });
			await loadCollections(selectedId);
			setSelectedCollectionId(created._id);
		}
		setEditor(null);
	};
	const confirmDelete = async () => {
		try {
			setDeleteBusy(true);
			setDeleteError("");
			if (deleting.kind === "folder") await collectionApi.removeFolder(deleting.collectionId, deleting.folder._id);
			else await collectionApi.remove(deleting.collection._id);
			await loadCollections(selectedId);
			setDeleting(null);
		} catch (deleteRequestError) {
			setDeleteError(deleteRequestError.message);
		} finally {
			setDeleteBusy(false);
		}
	};
	const applyCollectionOrder = async (collectionIds) => {
		try {
			setCollectionsError("");
			await collectionApi.reorder(selectedId, collectionIds);
			await loadCollections(selectedId);
		} catch (reorderError) {
			setCollectionsError(reorderError.message);
		}
	};
	const applyFolderOrder = async (collectionId, parentId, folderIds) => {
		try {
			setCollectionsError("");
			await collectionApi.reorderFolders(collectionId, parentId, folderIds);
			await loadCollections(selectedId);
		} catch (reorderError) {
			setCollectionsError(reorderError.message);
		}
	};
	const exportCollection = async (collection) => {
		try {
			setTransferError("");
			const result = await importExportApi.export(collection._id);
			const blob = new Blob([JSON.stringify(result.collection, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = result.filename || `${collection.name}.postman_collection.json`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} catch (exportError) {
			setTransferError(exportError.message);
		}
	};
	const importFile = async (file) => {
		try {
			setTransferError("");
			if (file.size > 5 * 1024 * 1024) throw new Error("The selected file exceeds the 5 MB limit.");
			const text = await file.text();
			let content;
			try {
				content = JSON.parse(text);
			} catch {
				throw new Error("The selected file is not valid JSON.");
			}
			const created = await importExportApi.import(selectedId, content);
			await loadCollections(selectedId);
			setSelectedCollectionId(String(created._id));
			setExpandedIds((current) => {
				const next = new Set(current);
				next.add(String(created._id));
				return next;
			});
		} catch (importError) {
			setTransferError(importError.message);
		}
	};
	const duplicateCollection = async (collection) => {
		try {
			setCollectionsError("");
			const created = await collectionApi.duplicate(collection._id);
			await loadCollections(selectedId);
			setSelectedCollectionId(created._id);
		} catch (duplicateError) {
			setCollectionsError(duplicateError.message);
		}
	};
	const selectedWorkspace = workspaces.find((workspace) => workspace._id === selectedId) || null;
	const selectedCollection = collections.find((collection) => String(collection._id) === String(selectedCollectionId)) || null;
	const selectedRequest = Object.values(requestsByCollection).flat().find((item) => String(item._id) === String(selectedRequestId)) || null;
	const selectedHistoryEntry = history.find((entry) => String(entry._id) === String(selectedHistoryId)) || null;
	const editing = Boolean(selectedRequest || selectedHistoryEntry);
	return (
		<div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
			<WorkspaceHeader
				account={account}
				activeEnvironment={activeEnvironment}
				environments={environments}
				onActivateEnvironment={activateEnvironment}
				onLogout={onLogout}
				onManageEnvironments={() => setEnvironmentManager({ view: "list", environment: null })}
				onNewEnvironment={() => setEnvironmentManager({ view: "edit", environment: null })}
				onSidebarToggle={toggleSidebar}
			/>
			<WorkspaceSidebar
				activeTab={sidebarTab}
				onTabChange={setSidebarTab}
				onApplyCollectionOrder={applyCollectionOrder}
				onApplyFolderOrder={applyFolderOrder}
				collections={collections}
				collectionsError={collectionsError}
				collectionsLoading={collectionsLoading}
				expandedIds={expandedIds}
				history={history}
				historyError={historyError}
				historyLoading={historyLoading}
				loading={loading}
				onClearHistory={() => { setHistoryActionError(""); setHistoryClearOpen(true); }}
				onDeleteCollection={requestDeleteCollection}
				onDeleteFolder={requestDeleteFolder}
				onDismissTransferError={() => setTransferError("")}
				onDuplicateCollection={duplicateCollection}
				onExportCollection={exportCollection}
				onImportFile={importFile}
				onNewCollection={openNewCollection}
				onNewFolder={openNewFolder}
				onRenameCollection={openRenameCollection}
				onRenameFolder={openRenameFolder}
				onRetryCollections={() => loadCollections(selectedId)}
				onRetryHistory={() => loadHistory(selectedId)}
				onSelect={setSelectedId}
				onSelectCollection={setSelectedCollectionId}
				onSelectHistory={selectHistory}
				onSelectRequest={selectRequest}
				onToggleCollection={toggleCollection}
				requestsByCollection={requestsByCollection}
				requestsLoading={requestsLoading}
				selectedCollectionId={selectedCollectionId}
				selectedHistoryId={selectedHistoryId}
				selectedId={selectedId}
				selectedRequestId={selectedRequestId}
				transferError={transferError}
				workspaces={workspaces}
			/>
			{!sidebarCollapsed && <button className="sidebar-scrim" aria-label="Close sidebar" onClick={toggleSidebar} />}
			<main className={`workspace-surface ${editing ? "editing" : ""}`}>
				{selectedRequest ? (
					<RequestEditor key={selectedRequest._id} request={selectedRequest} onSave={(payload) => saveRequest(selectedRequest, payload)} />
				) : selectedHistoryEntry ? (
					<HistoryDetail
						key={selectedHistoryEntry._id}
						entry={selectedHistoryEntry}
						onDelete={() => { setHistoryActionError(""); setHistoryDeleting(selectedHistoryEntry); }}
						onReplay={() => replayHistory(selectedHistoryEntry)}
						onSave={() => setHistorySaving(selectedHistoryEntry)}
						replaying={replaying}
					/>
				) : error ? (
					<div className="service-error" role="alert"><MaterialIcon size={20}>error_outline</MaterialIcon><span>{error}</span><button onClick={loadWorkspaces}>Retry</button></div>
				) : (
					<div className="workspace-empty">
						{selectedWorkspace && <p className="workspace-empty-eyebrow">{selectedWorkspace.name}</p>}
						{selectedCollection ? (
							<>
								<h1>{selectedCollection.name}</h1>
								<p>{selectedCollection.description || "Select a request from this collection to send it and inspect the response."}</p>
							</>
						) : (
							<>
								<h1>No request open</h1>
								<p>Choose a request from the sidebar to send it and inspect the response.</p>
							</>
						)}
					</div>
				)}
			</main>
			{editor && <CollectionEditor collection={editor.mode === "edit" ? (editor.kind === "folder" ? editor.folder : editor.collection) : null} kind={editor.kind} parentName={editor.parentName || ""} onClose={() => setEditor(null)} onSave={saveEditor} />}
			{environmentManager && (
				<EnvironmentManager
					activeId={activeEnvironment?._id}
					environments={environments}
					error={environmentsError}
					initialEnvironment={environmentManager.environment}
					initialView={environmentManager.view}
					onActivate={activateEnvironment}
					onClose={() => setEnvironmentManager(null)}
					onCreate={createEnvironment}
					onDelete={deleteEnvironment}
					onUpdate={updateEnvironment}
				/>
			)}
			{deleting && (
				<ConfirmationDialog
					busy={deleteBusy}
					confirmLabel="Delete"
					error={deleteError}
					message={deleting.kind === "folder" ? `"${deleting.folder.name}" will be permanently deleted.` : `"${deleting.collection.name}" and its requests will be permanently deleted.`}
					onCancel={() => { if (!deleteBusy) { setDeleting(null); setDeleteError(""); } }}
					onConfirm={confirmDelete}
					title={deleting.kind === "folder" ? "Delete folder?" : "Delete collection?"}
				/>
			)}
			{historySaving && (
				<SaveToCollectionDialog
					collections={collections}
					defaultName={`${historySaving.request.method} ${historySaving.request.rawUrl || historySaving.request.url}`.slice(0, 160)}
					onClose={() => setHistorySaving(null)}
					onSave={(payload) => saveHistory(historySaving, payload)}
				/>
			)}
			{historyDeleting && (
				<ConfirmationDialog
					busy={historyBusy}
					confirmLabel="Delete"
					error={historyActionError}
					message="This history entry will be permanently deleted."
					onCancel={() => { if (!historyBusy) { setHistoryDeleting(null); setHistoryActionError(""); } }}
					onConfirm={confirmDeleteHistory}
					title="Delete history entry?"
				/>
			)}
			{historyClearOpen && (
				<ConfirmationDialog
					busy={historyBusy}
					confirmLabel="Clear"
					error={historyActionError}
					message="All history for this workspace will be permanently deleted."
					onCancel={() => { if (!historyBusy) { setHistoryClearOpen(false); setHistoryActionError(""); } }}
					onConfirm={confirmClearHistory}
					title="Clear history?"
				/>
			)}
		</div>
	);
}
