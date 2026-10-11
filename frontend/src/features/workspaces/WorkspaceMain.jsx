import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { HistoryDetail } from "../history/HistoryDetail.jsx";
import { RequestEditor } from "../requests/RequestEditor.jsx";

export function WorkspaceMain({
	draft,
	error,
	historyEntry,
	loading,
	onDirtyChange,
	onHistoryDelete,
	onHistoryReplay,
	onHistorySave,
	onRetry,
	onSaveDraft,
	onSaveRequest,
	onSend,
	replaying,
	request,
	selectedCollection,
	selectedWorkspace,
}) {
	if (draft) return <RequestEditor key="draft" isDraft request={draft} onDirtyChange={onDirtyChange} onSave={onSaveDraft} onSend={onSend} />;
	if (request) return <RequestEditor key={request._id} request={request} onSave={(payload) => onSaveRequest(request, payload)} onSend={onSend} />;
	if (historyEntry) {
		return (
			<HistoryDetail
				key={historyEntry._id}
				entry={historyEntry}
				onDelete={() => onHistoryDelete(historyEntry)}
				onReplay={() => onHistoryReplay(historyEntry)}
				onSave={() => onHistorySave(historyEntry)}
				replaying={replaying}
			/>
		);
	}
	if (loading) {
		return (
			<div className="workspace-empty" role="status">
				<div className="workspace-loading">
					<span className="spinner" />
					Loading workspace…
				</div>
			</div>
		);
	}
	if (error) {
		return (
			<div className="service-error" role="alert">
				<MaterialIcon size={20}>error_outline</MaterialIcon>
				<span>{error}</span>
				<button onClick={onRetry}>Retry</button>
			</div>
		);
	}
	return (
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
	);
}
