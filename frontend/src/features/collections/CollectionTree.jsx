import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { OptionsMenu } from "../../shared/components/OptionsMenu.jsx";
import { buildFolderTree, moveInList, reorderIds, siblingsOf } from "./collection-tree.js";

const dragKey = (kind, id) => `${kind}:${id}`;
const sameGroup = (left, right) => left.kind === right.kind && String(left.parent ?? "") === String(right.parent ?? "");
const descriptorFor = (collection, folder = null) =>
	folder
		? { kind: "folder", id: String(folder._id), parent: folder.parentId ? String(folder.parentId) : null, collectionId: String(collection._id) }
		: { kind: "collection", id: String(collection._id), parent: null, collectionId: String(collection._id) };
const requestsFor = (requests, folderId) =>
	requests
		.filter((item) => (item.folderId ? String(item.folderId) : null) === (folderId ? String(folderId) : null))
		.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

function RequestsList({ collectionId, onOpenMenu, onSelectRequest, requests, selectedRequestId }) {
	return (
		<ul className="folder-list">
			{requests.map((item) => {
				const selected = String(item._id) === String(selectedRequestId);
				return (
					<li key={item._id}>
						<div className={`tree-row request-row ${selected ? "active" : ""}`}>
							<span className="drag-spacer" aria-hidden="true" />
							<span className="tree-toggle-spacer" aria-hidden="true" />
							<button className="request-select" aria-current={selected ? "true" : undefined} onClick={() => onSelectRequest(collectionId, String(item._id))}>
								<span className={`method-badge method-${String(item.method).toLowerCase()}`}>{item.method}</span>
								<span className="tree-name">{item.name}</span>
							</button>
							<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${item.name}`} onClick={(event) => onOpenMenu(event, { key: dragKey("request", item._id), kind: "request", collectionId, request: item })}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

function TreeRow({ children, descriptor, draggingKey, dropTarget, onDragEnd, onDragMove, onDragStart, onDragCancel, className = "" }) {
	const key = dragKey(descriptor.kind, descriptor.id);
	const target = dropTarget?.key === key ? dropTarget.position : null;
	const classes = ["tree-row", className, draggingKey === key ? "dragging" : "", target ? `drop-${target}` : ""].filter(Boolean).join(" ");
	const dragHandlers = {
		onPointerDown: (event) => onDragStart(event, descriptor),
		onPointerMove: onDragMove,
		onPointerUp: onDragEnd,
		onPointerCancel: onDragCancel,
	};
	return (
		<div
			className={classes}
			data-drop-collection={descriptor.collectionId}
			data-drop-id={descriptor.id}
			data-drop-key={key}
			data-drop-kind={descriptor.kind}
			data-drop-parent={descriptor.parent ?? ""}
		>
			{children(dragHandlers)}
		</div>
	);
}

function FolderBranch({ collection, collectionRequests, draggingKey, dropTarget, expandedIds, nodes, onDragCancel, onDragEnd, onDragMove, onDragStart, onOpenMenu, onSelectRequest, onToggle, selectedRequestId }) {
	return (
		<ul className="folder-list">
			{nodes.map(({ folder, children }) => {
				const id = String(folder._id);
				const expanded = expandedIds.has(id);
				const folderRequests = requestsFor(collectionRequests, id);
				const expandable = children.length > 0 || folderRequests.length > 0;
				return (
					<li key={id}>
						<TreeRow className="folder-row" descriptor={descriptorFor(collection, folder)} draggingKey={draggingKey} dropTarget={dropTarget} onDragCancel={onDragCancel} onDragEnd={onDragEnd} onDragMove={onDragMove} onDragStart={onDragStart}>
							{(dragHandlers) => (
								<>
									{nodes.length > 1 ? <button className="drag-handle" type="button" tabIndex={-1} aria-hidden="true" {...dragHandlers}><MaterialIcon size={16}>drag_indicator</MaterialIcon></button> : <span className="drag-spacer" aria-hidden="true" />}
									{expandable ? (
										<button className={`tree-toggle ${expanded ? "expanded" : ""}`} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`} onClick={() => onToggle(id)}><MaterialIcon size={18}>chevron_right</MaterialIcon></button>
									) : (
										<span className="tree-toggle-spacer" aria-hidden="true" />
									)}
									<span className="tree-name">{folder.name}</span>
									<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${folder.name}`} onClick={(event) => onOpenMenu(event, { key: dragKey("folder", id), kind: "folder", collection, folder })}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
								</>
							)}
						</TreeRow>
						{expanded && children.length > 0 && <FolderBranch collection={collection} collectionRequests={collectionRequests} draggingKey={draggingKey} dropTarget={dropTarget} expandedIds={expandedIds} nodes={children} onDragCancel={onDragCancel} onDragEnd={onDragEnd} onDragMove={onDragMove} onDragStart={onDragStart} onOpenMenu={onOpenMenu} onSelectRequest={onSelectRequest} onToggle={onToggle} selectedRequestId={selectedRequestId} />}
						{expanded && folderRequests.length > 0 && <RequestsList collectionId={String(collection._id)} onOpenMenu={onOpenMenu} onSelectRequest={onSelectRequest} requests={folderRequests} selectedRequestId={selectedRequestId} />}
					</li>
				);
			})}
		</ul>
	);
}

export function CollectionTree({ collections, error, expandedIds, loading, onApplyCollectionOrder, onApplyFolderOrder, onDeleteCollection, onDeleteFolder, onDeleteRequest, onDuplicateCollection, onDuplicateRequest, onExportCollection, onNewFolder, onNewRequest, onRenameCollection, onRenameFolder, onRetry, onRetryRequests, onSelect, onSelectRequest, onToggle, requestsByCollection, requestsError, requestsLoading, selectedId, selectedRequestId }) {
	const [menu, setMenu] = useState(null);
	const [draggingKey, setDraggingKey] = useState(null);
	const [dropTarget, setDropTarget] = useState(null);
	const dragReference = useRef(null);
	const collectionIds = collections.map((item) => String(item._id));
	const openMenu = (event, descriptor) => {
		const rectangle = event.currentTarget.getBoundingClientRect();
		setMenu((current) => (current?.key === descriptor.key ? null : { ...descriptor, position: { left: Math.min(rectangle.right + 8, window.innerWidth - 220), top: Math.max(8, Math.min(rectangle.bottom + 4, window.innerHeight - 240)) } }));
	};
	const moveCollection = (collection, direction) => {
		const next = moveInList(collectionIds, String(collection._id), direction);
		if (next) onApplyCollectionOrder(next);
	};
	const moveFolder = (collection, folder, direction) => {
		const siblings = siblingsOf(collection.folders, folder.parentId);
		const next = moveInList(siblings.map((item) => String(item._id)), String(folder._id), direction);
		if (next) onApplyFolderOrder(String(collection._id), folder.parentId ?? null, next);
	};
	const applyDrop = (drag, target) => {
		if (!sameGroup(drag, target) || drag.id === target.id) return;
		if (drag.kind === "collection") {
			const next = reorderIds(collectionIds, drag.id, target.id, target.position);
			if (next) onApplyCollectionOrder(next);
			return;
		}
		const collection = collections.find((item) => String(item._id) === String(target.collectionId));
		if (!collection) return;
		const siblings = siblingsOf(collection.folders, target.parent);
		const next = reorderIds(siblings.map((item) => String(item._id)), drag.id, target.id, target.position);
		if (next) onApplyFolderOrder(String(collection._id), target.parent, next);
	};
	const onDragStart = (event, descriptor) => {
		if (event.pointerType === "mouse" && event.button !== 0) return;
		dragReference.current = { ...descriptor, pointerId: event.pointerId, started: false, x0: event.clientX, y0: event.clientY, target: null };
		event.currentTarget.setPointerCapture(event.pointerId);
	};
	const onDragMove = (event) => {
		const drag = dragReference.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (!drag.started) {
			if (Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0) < 5) return;
			drag.started = true;
			setDraggingKey(dragKey(drag.kind, drag.id));
		}
		const element = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-key]");
		if (!element) {
			drag.target = null;
			setDropTarget(null);
			return;
		}
		const target = { key: element.dataset.dropKey, kind: element.dataset.dropKind, id: element.dataset.dropId, parent: element.dataset.dropParent || null, collectionId: element.dataset.dropCollection };
		if (target.id === drag.id || !sameGroup(drag, target)) {
			drag.target = null;
			setDropTarget(null);
			return;
		}
		const rectangle = element.getBoundingClientRect();
		const position = event.clientY < rectangle.top + rectangle.height / 2 ? "before" : "after";
		drag.target = { ...target, position };
		setDropTarget({ key: target.key, position });
		const scroller = event.currentTarget.closest(".sidebar");
		if (scroller) {
			const bounds = scroller.getBoundingClientRect();
			if (event.clientY < bounds.top + 28) scroller.scrollTop -= 8;
			else if (event.clientY > bounds.bottom - 28) scroller.scrollTop += 8;
		}
	};
	const finishDrag = (event) => {
		const drag = dragReference.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (drag.started && drag.target) applyDrop(drag, drag.target);
		try {
			event.currentTarget.releasePointerCapture(event.pointerId);
		} catch {}
		dragReference.current = null;
		setDraggingKey(null);
		setDropTarget(null);
	};
	const cancelDrag = (event) => {
		const drag = dragReference.current;
		if (!drag) return;
		try {
			event.currentTarget.releasePointerCapture?.(drag.pointerId);
		} catch {}
		dragReference.current = null;
		setDraggingKey(null);
		setDropTarget(null);
	};
	useEffect(() => {
		if (!draggingKey) return undefined;
		const onKeyDown = (event) => {
			if (event.key !== "Escape") return;
			dragReference.current = null;
			setDraggingKey(null);
			setDropTarget(null);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [draggingKey]);
	const collectionItems = (collection) => {
		const index = collectionIds.indexOf(String(collection._id));
		return [
			{ icon: "add", label: "New folder", onSelect: () => onNewFolder(collection) },
			{ icon: "add", label: "New request", onSelect: () => onNewRequest(collection) },
			{ icon: "content_copy", label: "Duplicate", onSelect: () => onDuplicateCollection(collection) },
			{ icon: "arrow_upward", label: "Move up", disabled: index <= 0, onSelect: () => moveCollection(collection, -1) },
			{ icon: "arrow_downward", label: "Move down", disabled: index >= collectionIds.length - 1, onSelect: () => moveCollection(collection, 1) },
			{ icon: "edit", label: "Rename", onSelect: () => onRenameCollection(collection) },
			{ icon: "download", label: "Export", onSelect: () => onExportCollection(collection) },
			{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteCollection(collection) },
		];
	};
	const folderItems = (collection, folder) => {
		const siblings = siblingsOf(collection.folders, folder.parentId);
		const index = siblings.findIndex((item) => String(item._id) === String(folder._id));
		return [
			{ icon: "add", label: "New subfolder", onSelect: () => onNewFolder(collection, folder) },
			{ icon: "add", label: "New request", onSelect: () => onNewRequest(collection, folder) },
			{ icon: "arrow_upward", label: "Move up", disabled: index <= 0, onSelect: () => moveFolder(collection, folder, -1) },
			{ icon: "arrow_downward", label: "Move down", disabled: index >= siblings.length - 1, onSelect: () => moveFolder(collection, folder, 1) },
			{ icon: "edit", label: "Rename", onSelect: () => onRenameFolder(collection, folder) },
			{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteFolder(collection, folder) },
		];
	};
	const requestItems = (request) => [
		{ icon: "content_copy", label: "Duplicate", onSelect: () => onDuplicateRequest(request) },
		{ icon: "delete", label: "Delete", danger: true, onSelect: () => onDeleteRequest(request) },
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
				const collectionRequests = requestsByCollection[id] || [];
				const rootRequests = requestsFor(collectionRequests, null);
				const loadingRequests = Boolean(requestsLoading[id]);
				const requestsLoadError = requestsError?.[id];
				return (
					<li key={id}>
						<TreeRow className={`collection-row ${id === selectedId ? "active" : ""}`} descriptor={descriptorFor(collection)} draggingKey={draggingKey} dropTarget={dropTarget} onDragCancel={cancelDrag} onDragEnd={finishDrag} onDragMove={onDragMove} onDragStart={onDragStart}>
							{(dragHandlers) => (
								<>
									{collectionIds.length > 1 ? <button className="drag-handle" type="button" tabIndex={-1} aria-hidden="true" {...dragHandlers}><MaterialIcon size={16}>drag_indicator</MaterialIcon></button> : <span className="drag-spacer" aria-hidden="true" />}
									<button className={`tree-toggle ${expanded ? "expanded" : ""}`} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${collection.name}`} onClick={() => onToggle(id)}><MaterialIcon size={18}>chevron_right</MaterialIcon></button>
									<button className="collection-select" aria-current={id === selectedId ? "true" : undefined} onClick={() => onSelect(id)}>
										<MaterialIcon size={18}>folder</MaterialIcon>
										<span className="tree-name">{collection.name}</span>
									</button>
									<button className="collection-menu-button" aria-haspopup="menu" aria-label={`More options for ${collection.name}`} onClick={(event) => openMenu(event, { key: dragKey("collection", id), kind: "collection", collection })}><MaterialIcon size={18}>more_vert</MaterialIcon></button>
								</>
							)}
						</TreeRow>
						{expanded && hasFolders && <FolderBranch collection={collection} collectionRequests={collectionRequests} draggingKey={draggingKey} dropTarget={dropTarget} expandedIds={expandedIds} nodes={buildFolderTree(collection.folders)} onDragCancel={cancelDrag} onDragEnd={finishDrag} onDragMove={onDragMove} onDragStart={onDragStart} onOpenMenu={openMenu} onSelectRequest={onSelectRequest} onToggle={onToggle} selectedRequestId={selectedRequestId} />}
						{expanded && loadingRequests && <ul className="folder-list"><li className="tree-loading">Loading requests…</li></ul>}
						{expanded && !loadingRequests && requestsLoadError && <div className="sidebar-error" role="alert"><span>{requestsLoadError}</span><button onClick={() => onRetryRequests(id)}>Try again</button></div>}
						{expanded && !loadingRequests && !requestsLoadError && rootRequests.length > 0 && <RequestsList collectionId={id} onOpenMenu={openMenu} onSelectRequest={onSelectRequest} requests={rootRequests} selectedRequestId={selectedRequestId} />}
					</li>
				);
			})}
			{menu && <OptionsMenu ariaLabel={menu.kind === "request" ? `${menu.request.name} options` : menu.kind === "folder" ? `${menu.folder.name} options` : `${menu.collection.name} options`} items={menu.kind === "request" ? requestItems(menu.request) : menu.kind === "folder" ? folderItems(menu.collection, menu.folder) : collectionItems(menu.collection)} onClose={() => setMenu(null)} position={menu.position} />}
		</ul>
	);
}
