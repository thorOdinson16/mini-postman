import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { formatRelativeTime } from "../../shared/utils/time.js";

const statusClass = (response) => {
	if (response.error || !response.status) return "error";
	if (response.status < 300) return "success";
	if (response.status < 400) return "redirect";
	if (response.status < 500) return "client";
	return "server";
};

export function HistoryList({ entries, error, loading, onClear, onRetry, onSelect, selectedId }) {
	if (loading) return <div className="collection-skeleton" aria-hidden="true"><span /><span /><span /></div>;
	if (error) return <div className="sidebar-error" role="alert"><span>{error}</span><button onClick={onRetry}>Try again</button></div>;
	if (!entries.length) return <p className="sidebar-empty">No requests sent yet.</p>;
	return (
		<>
			<ul className="history-list" aria-label="Request history">
				{entries.map((entry) => {
					const selected = String(entry._id) === String(selectedId);
					return (
						<li key={entry._id}>
							<button type="button" className={`history-item ${selected ? "active" : ""}`} aria-current={selected ? "true" : undefined} onClick={() => onSelect(String(entry._id))}>
								<span className={`method-badge method-${String(entry.request.method).toLowerCase()}`}>{entry.request.method}</span>
								<span className="history-item-body">
									<span className="history-item-url">{entry.request.rawUrl || entry.request.url}</span>
									<span className="history-item-meta">
										<span className={`history-status ${statusClass(entry.response)}`}>{entry.response.error ? "Error" : entry.response.status}</span>
										<span className="history-item-time">{formatRelativeTime(entry.sentAt)}</span>
									</span>
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			<button type="button" className="history-clear" onClick={onClear}><MaterialIcon size={16}>delete</MaterialIcon><span>Clear history</span></button>
		</>
	);
}
