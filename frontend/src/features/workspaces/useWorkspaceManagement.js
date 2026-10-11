import { useState } from "react";
import { workspaceApi } from "./workspace.api.js";

export function useWorkspaceManagement({ reload, onError }) {
	const [editor, setEditor] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [busy, setBusy] = useState(false);
	const [actionError, setActionError] = useState("");
	const save = async (values) => {
		if (editor.mode === "edit") await workspaceApi.update(editor.workspace._id, values);
		else await workspaceApi.create(values);
		await reload();
		setEditor(null);
	};
	const setDefault = async (workspace) => {
		try {
			await workspaceApi.update(workspace._id, { isDefault: true });
			await reload();
		} catch (defaultError) {
			onError(defaultError.message);
		}
	};
	const requestDelete = (workspace) => {
		setActionError("");
		setDeleting(workspace);
	};
	const confirmDelete = async () => {
		try {
			setBusy(true);
			setActionError("");
			await workspaceApi.remove(deleting._id);
			await reload();
			setDeleting(null);
		} catch (deleteError) {
			setActionError(deleteError.message);
		} finally {
			setBusy(false);
		}
	};
	const cancelDelete = () => {
		if (busy) return;
		setDeleting(null);
		setActionError("");
	};
	return {
		editor,
		deleting,
		busy,
		actionError,
		openNew: () => setEditor({ mode: "create" }),
		openRename: (workspace) => setEditor({ mode: "edit", workspace }),
		closeEditor: () => setEditor(null),
		save,
		setDefault,
		requestDelete,
		confirmDelete,
		cancelDelete,
	};
}
