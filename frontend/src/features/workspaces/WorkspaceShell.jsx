import { useCallback, useEffect, useRef, useState } from "react";
import { collectionApi } from "../collections/collection.api.js";
import { CollectionEditor } from "../collections/CollectionEditor.jsx";
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
	useEffect(() => {
		setExpandedIds(new Set());
		loadedCollections.current = new Set();
		setRequestsByCollection({});
		setRequestsLoading({});
		setSelectedRequestId("");
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
	const selectRequest = (collectionId, requestId) => {
		setSelectedCollectionId(collectionId);
		setSelectedRequestId(requestId);
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
	return (
		<div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
			<WorkspaceHeader account={account} onLogout={onLogout} onSidebarToggle={toggleSidebar} />
			<WorkspaceSidebar
				onApplyCollectionOrder={applyCollectionOrder}
				onApplyFolderOrder={applyFolderOrder}
				collections={collections}
				collectionsError={collectionsError}
				collectionsLoading={collectionsLoading}
				expandedIds={expandedIds}
				loading={loading}
				onDeleteCollection={requestDeleteCollection}
				onDeleteFolder={requestDeleteFolder}
				onDuplicateCollection={duplicateCollection}
				onNewCollection={openNewCollection}
				onNewFolder={openNewFolder}
				onRenameCollection={openRenameCollection}
				onRenameFolder={openRenameFolder}
				onRetryCollections={() => loadCollections(selectedId)}
				onSelect={setSelectedId}
				onSelectCollection={setSelectedCollectionId}
				onSelectRequest={selectRequest}
				onToggleCollection={toggleCollection}
				requestsByCollection={requestsByCollection}
				requestsLoading={requestsLoading}
				selectedCollectionId={selectedCollectionId}
				selectedId={selectedId}
				selectedRequestId={selectedRequestId}
				workspaces={workspaces}
			/>
			{!sidebarCollapsed && <button className="sidebar-scrim" aria-label="Close sidebar" onClick={toggleSidebar} />}
			<main className={`workspace-surface ${selectedRequest ? "editing" : ""}`}>
				{selectedRequest ? (
					<RequestEditor key={selectedRequest._id} request={selectedRequest} onSave={(payload) => saveRequest(selectedRequest, payload)} />
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
		</div>
	);
}
