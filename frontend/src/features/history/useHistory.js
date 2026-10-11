import { useCallback, useEffect, useState } from "react";
import { historyApi } from "./history.api.js";

export function useHistory({ workspaceId, selectedHistoryId, onSelect, onSaved }) {
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [deleting, setDeleting] = useState(null);
	const [clearOpen, setClearOpen] = useState(false);
	const [saving, setSaving] = useState(null);
	const [busy, setBusy] = useState(false);
	const [actionError, setActionError] = useState("");
	const [replaying, setReplaying] = useState(false);
	const load = useCallback(async (id) => {
		if (!id) {
			setHistory([]);
			setError("");
			setLoading(false);
			return [];
		}
		try {
			setError("");
			setLoading(true);
			const list = await historyApi.list(id);
			setHistory(list);
			return list;
		} catch (loadError) {
			setError(loadError.message);
			setHistory([]);
			return [];
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		load(workspaceId);
	}, [workspaceId, load]);
	const replay = async (entry) => {
		try {
			setReplaying(true);
			setError("");
			const result = await historyApi.replay(entry._id);
			await load(workspaceId);
			onSelect(String(result.historyId));
		} catch (replayError) {
			setError(replayError.message);
		} finally {
			setReplaying(false);
		}
	};
	const save = async (entry, payload) => {
		const created = await historyApi.save(entry._id, payload);
		await onSaved(created);
		setSaving(null);
	};
	const requestDelete = (entry) => {
		setActionError("");
		setDeleting(entry);
	};
	const requestClear = () => {
		setActionError("");
		setClearOpen(true);
	};
	const confirmDelete = async () => {
		try {
			setBusy(true);
			setActionError("");
			await historyApi.remove(deleting._id);
			await load(workspaceId);
			if (String(selectedHistoryId) === String(deleting._id)) onSelect("");
			setDeleting(null);
		} catch (deleteError) {
			setActionError(deleteError.message);
		} finally {
			setBusy(false);
		}
	};
	const confirmClear = async () => {
		try {
			setBusy(true);
			setActionError("");
			await historyApi.clear(workspaceId);
			await load(workspaceId);
			onSelect("");
			setClearOpen(false);
		} catch (clearError) {
			setActionError(clearError.message);
		} finally {
			setBusy(false);
		}
	};
	const cancelDelete = () => {
		if (busy) return;
		setDeleting(null);
		setActionError("");
	};
	const cancelClear = () => {
		if (busy) return;
		setClearOpen(false);
		setActionError("");
	};
	return {
		history,
		loading,
		error,
		reload: () => load(workspaceId),
		deleting,
		clearOpen,
		saving,
		busy,
		actionError,
		replaying,
		replay,
		save,
		openSave: setSaving,
		closeSave: () => setSaving(null),
		requestDelete,
		requestClear,
		confirmDelete,
		confirmClear,
		cancelDelete,
		cancelClear,
	};
}
