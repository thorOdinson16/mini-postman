import { useCallback, useEffect, useRef, useState } from "react";
import { collectionApi } from "../collections/collection.api.js";
import { CollectionEditor } from "../collections/CollectionEditor.jsx";
import { EnvironmentManager } from "../environments/EnvironmentManager.jsx";
import { useEnvironments } from "../environments/useEnvironments.js";
import { HistoryDialogs } from "../history/HistoryDialogs.jsx";
import { SaveToCollectionDialog } from "../history/SaveToCollectionDialog.jsx";
import { useHistory } from "../history/useHistory.js";
import { importExportApi } from "../import-export/import-export.api.js";
import { downloadJson, readJsonFile } from "../import-export/transfer.js";
import { requestApi } from "../requests/request.api.js";
import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog.jsx";
import { WorkspaceDialogs } from "./WorkspaceDialogs.jsx";
import { WorkspaceHeader } from "./WorkspaceHeader.jsx";
import { WorkspaceMain } from "./WorkspaceMain.jsx";
import { WorkspaceSidebar } from "./WorkspaceSidebar.jsx";
import { useWorkspaceManagement } from "./useWorkspaceManagement.js";
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
	const [requestsError, setRequestsError] = useState({});
	const [selectedRequestId, setSelectedRequestId] = useState("");
	const [environmentManager, setEnvironmentManager] = useState(null);
	const [sidebarTab, setSidebarTab] = useState("collections");
	const [selectedHistoryId, setSelectedHistoryId] = useState("");
	const [transferError, setTransferError] = useState("");
	const [requestDeleting, setRequestDeleting] = useState(null);
	const [requestBusy, setRequestBusy] = useState(false);
	const [requestActionError, setRequestActionError] = useState("");
	const [draft, setDraft] = useState(null);
	const [draftDirty, setDraftDirty] = useState(false);
	const [discardAction, setDiscardAction] = useState(null);
	const [draftSavePayload, setDraftSavePayload] = useState(null);
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
			setRequestsError((current) => ({ ...current, [collectionId]: "" }));
		} catch (requestError) {
			loadedCollections.current.delete(collectionId);
			setRequestsByCollection((current) => ({ ...current, [collectionId]: [] }));
			setRequestsError((current) => ({ ...current, [collectionId]: requestError.message }));
		} finally {
			setRequestsLoading((current) => ({ ...current, [collectionId]: false }));
		}
	}, []);
	const expand = (ids) => setExpandedIds((current) => {
		const next = new Set(current);
		for (const id of ids) if (id) next.add(String(id));
		return next;
	});
	const showCreatedRequest = async (created) => {
		await loadCollections(selectedId);
		await loadRequests(String(created.collectionId), true);
		setSelectedCollectionId(String(created.collectionId));
		setSelectedRequestId(String(created._id));
		setSelectedHistoryId("");
		setSidebarTab("collections");
		expand([String(created.collectionId), created.folderId]);
	};
	const environmentState = useEnvironments(selectedId);
	const historyState = useHistory({ workspaceId: selectedId, selectedHistoryId, onSelect: setSelectedHistoryId, onSaved: showCreatedRequest });
	const workspaceState = useWorkspaceManagement({ reload: loadWorkspaces, onError: setError });
	useEffect(() => {
		setExpandedIds(new Set());
		loadedCollections.current = new Set();
		setRequestsByCollection({});
		setRequestsLoading({});
		setRequestsError({});
		setSelectedRequestId("");
		setSelectedHistoryId("");
		setSidebarTab("collections");
		loadCollections(selectedId);
	}, [selectedId, loadCollections]);
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
	const clearDraft = () => {
		setDraft(null);
		setDraftDirty(false);
	};
	const guardDraft = (action) => {
		if (draft && draftDirty) {
			setDiscardAction(() => action);
			return;
		}
		clearDraft();
		action();
	};
	const selectRequest = (collectionId, requestId) =>
		guardDraft(() => {
			clearDraft();
			setSelectedCollectionId(collectionId);
			setSelectedRequestId(requestId);
			setSelectedHistoryId("");
			setSidebarTab("collections");
		});
	const selectHistory = (id) =>
		guardDraft(() => {
			clearDraft();
			setSelectedHistoryId(id);
			setSelectedRequestId("");
		});
	const selectCollection = (id) =>
		guardDraft(() => {
			clearDraft();
			setSelectedCollectionId(id);
		});
	const selectWorkspace = (id) =>
		guardDraft(() => {
			clearDraft();
			setSelectedId(id);
		});
	const saveRequest = async (requestItem, payload) => {
		const updated = await requestApi.update(requestItem._id, payload);
		await loadRequests(String(requestItem.collectionId), true);
		setSelectedRequestId(String(updated._id));
	};
	const sendRequestEditor = async (payload) => {
		if (draft) return requestApi.sendAdHoc({ workspaceId: selectedId, ...payload });
		return requestApi.send(selectedRequestId);
	};
	const confirmSaveDraft = async (values) => {
		const created = await requestApi.create({
			collectionId: values.collectionId,
			folderId: values.folderId,
			name: values.name,
			method: draftSavePayload.method,
			url: draftSavePayload.url,
			queryParams: draftSavePayload.queryParams,
			headers: draftSavePayload.headers,
			body: draftSavePayload.body,
			auth: draftSavePayload.auth,
		});
		await showCreatedRequest(created);
		clearDraft();
		setDraftSavePayload(null);
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
	const resetRequests = () => {
		loadedCollections.current = new Set();
		setRequestsByCollection({});
		setRequestsLoading({});
		setRequestsError({});
		setSelectedRequestId("");
	};
	const saveEditor = async (values) => {
		if (editor.kind === "folder") {
			if (editor.mode === "edit") {
				await collectionApi.renameFolder(editor.collectionId, editor.folder._id, { name: values.name });
				await loadCollections(selectedId);
			} else {
				await collectionApi.addFolder(editor.collectionId, { name: values.name, parentId: editor.parentId });
				expand([editor.collectionId, editor.parentId]);
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
			resetRequests();
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
	const startDraft = (collection, folder = null) => {
		clearDraft();
		setDraft({
			_id: "draft",
			name: "New request",
			method: "GET",
			url: "",
			queryParams: [],
			headers: [],
			body: { mode: "none", raw: "", formData: [], urlEncoded: [] },
			auth: { type: "none", bearer: { token: "" }, basic: { username: "", password: "" }, apiKey: { key: "", value: "", addTo: "header" } },
			collectionId: String(collection._id),
			folderId: folder ? String(folder._id) : null,
		});
		setSelectedCollectionId(String(collection._id));
		setSelectedRequestId("");
		setSelectedHistoryId("");
		setSidebarTab("collections");
		expand([String(collection._id), folder?._id]);
	};
	const openNewRequest = (collection, folder = null) => {
		if (collection) guardDraft(() => startDraft(collection, folder));
	};
	const duplicateRequest = async (request) => {
		try {
			const created = await requestApi.duplicate(request._id);
			await loadRequests(String(request.collectionId), true);
			setSelectedCollectionId(String(request.collectionId));
			setSelectedRequestId(String(created._id));
			setSelectedHistoryId("");
		} catch (duplicateError) {
			setRequestsError((current) => ({ ...current, [String(request.collectionId)]: duplicateError.message }));
		}
	};
	const requestDeleteRequest = (request) => {
		setRequestActionError("");
		setRequestDeleting(request);
	};
	const confirmDeleteRequest = async () => {
		try {
			setRequestBusy(true);
			setRequestActionError("");
			await requestApi.remove(requestDeleting._id);
			await loadRequests(String(requestDeleting.collectionId), true);
			if (String(selectedRequestId) === String(requestDeleting._id)) setSelectedRequestId("");
			setRequestDeleting(null);
		} catch (requestDeleteError) {
			setRequestActionError(requestDeleteError.message);
		} finally {
			setRequestBusy(false);
		}
	};
	const exportCollection = async (collection) => {
		try {
			setTransferError("");
			const result = await importExportApi.export(collection._id);
			downloadJson(result.collection, result.filename || `${collection.name}.postman_collection.json`);
		} catch (exportError) {
			setTransferError(exportError.message);
		}
	};
	const importFile = async (file) => {
		try {
			setTransferError("");
			const content = await readJsonFile(file);
			const created = await importExportApi.import(selectedId, content);
			await loadCollections(selectedId);
			setSelectedCollectionId(String(created._id));
			expand([String(created._id)]);
		} catch (importError) {
			setTransferError(importError.message);
		}
	};
	const selectedWorkspace = workspaces.find((workspace) => workspace._id === selectedId) || null;
	const selectedCollection = collections.find((collection) => String(collection._id) === String(selectedCollectionId)) || null;
	const selectedRequest = Object.values(requestsByCollection).flat().find((item) => String(item._id) === String(selectedRequestId)) || null;
	const selectedHistoryEntry = historyState.history.find((entry) => String(entry._id) === String(selectedHistoryId)) || null;
	const editing = Boolean(draft || selectedRequest || selectedHistoryEntry);
	return (
		<div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
			<WorkspaceHeader
				account={account}
				activeEnvironment={environmentState.activeEnvironment}
				environments={environmentState.environments}
				onActivateEnvironment={environmentState.activate}
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
				history={historyState.history}
				historyError={historyState.error}
				historyLoading={historyState.loading}
				loading={loading}
				onClearHistory={historyState.requestClear}
				onDeleteCollection={requestDeleteCollection}
				onDeleteFolder={requestDeleteFolder}
				onDeleteRequest={requestDeleteRequest}
				onDeleteWorkspace={workspaceState.requestDelete}
				onDismissTransferError={() => setTransferError("")}
				onDuplicateCollection={duplicateCollection}
				onDuplicateRequest={duplicateRequest}
				onExportCollection={exportCollection}
				onImportFile={importFile}
				onNewCollection={openNewCollection}
				onNewFolder={openNewFolder}
				onNewRequest={openNewRequest}
				onNewWorkspace={workspaceState.openNew}
				onRenameCollection={openRenameCollection}
				onRenameFolder={openRenameFolder}
				onRenameWorkspace={workspaceState.openRename}
				onRetryCollections={() => loadCollections(selectedId)}
				onRetryHistory={historyState.reload}
				onRetryRequests={(collectionId) => loadRequests(collectionId, true)}
				onSelect={selectWorkspace}
				onSelectCollection={selectCollection}
				onSelectHistory={selectHistory}
				onSelectRequest={selectRequest}
				onSetDefaultWorkspace={workspaceState.setDefault}
				onToggleCollection={toggleCollection}
				requestsByCollection={requestsByCollection}
				requestsError={requestsError}
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
				<WorkspaceMain
					draft={draft}
					error={error}
					historyEntry={selectedHistoryEntry}
					loading={loading}
					onDirtyChange={setDraftDirty}
					onHistoryDelete={historyState.requestDelete}
					onHistoryReplay={historyState.replay}
					onHistorySave={historyState.openSave}
					onRetry={loadWorkspaces}
					onSaveDraft={setDraftSavePayload}
					onSaveRequest={saveRequest}
					onSend={sendRequestEditor}
					replaying={historyState.replaying}
					request={selectedRequest}
					selectedCollection={selectedCollection}
					selectedWorkspace={selectedWorkspace}
				/>
			</main>
			{editor && <CollectionEditor collection={editor.mode === "edit" ? (editor.kind === "folder" ? editor.folder : editor.collection) : null} kind={editor.kind} parentName={editor.parentName || ""} onClose={() => setEditor(null)} onSave={saveEditor} />}
			<WorkspaceDialogs state={workspaceState} />
			{environmentManager && (
				<EnvironmentManager
					activeId={environmentState.activeEnvironment?._id}
					environments={environmentState.environments}
					error={environmentState.error}
					initialEnvironment={environmentManager.environment}
					initialView={environmentManager.view}
					onActivate={environmentState.activate}
					onClose={() => setEnvironmentManager(null)}
					onCreate={environmentState.create}
					onDelete={environmentState.remove}
					onUpdate={environmentState.update}
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
			{requestDeleting && (
				<ConfirmationDialog
					busy={requestBusy}
					confirmLabel="Delete"
					error={requestActionError}
					message={`"${requestDeleting.name}" will be permanently deleted.`}
					onCancel={() => { if (!requestBusy) { setRequestDeleting(null); setRequestActionError(""); } }}
					onConfirm={confirmDeleteRequest}
					title="Delete request?"
				/>
			)}
			{draftSavePayload && draft && (
				<SaveToCollectionDialog
					collections={collections}
					defaultCollectionId={draft.collectionId}
					defaultFolderId={draft.folderId}
					defaultName={draft.name}
					onClose={() => setDraftSavePayload(null)}
					onSave={confirmSaveDraft}
				/>
			)}
			{discardAction && (
				<ConfirmationDialog
					busy={false}
					confirmLabel="Discard"
					message="This request has not been saved. Continuing will discard your changes."
					onCancel={() => setDiscardAction(null)}
					onConfirm={() => { const action = discardAction; setDiscardAction(null); action(); }}
					title="Discard unsaved request?"
				/>
			)}
			<HistoryDialogs collections={collections} state={historyState} />
		</div>
	);
}
