import { ResponseViewer } from "../requests/ResponseViewer.jsx";
import { formatRelativeTime } from "../../shared/utils/time.js";

export function HistoryDetail({ entry, onDelete, onReplay, onSave, replaying = false }) {
	return (
		<section className="history-detail">
			<div className="history-detail-bar">
				<span className={`method-badge method-${String(entry.request.method).toLowerCase()}`}>{entry.request.method}</span>
				<code className="history-detail-url">{entry.request.url}</code>
				<span className="history-detail-time">{formatRelativeTime(entry.sentAt)}</span>
				<div className="history-detail-actions">
					<button type="button" disabled={replaying} onClick={onReplay}>{replaying ? "Replaying…" : "Replay"}</button>
					<button type="button" onClick={onSave}>Save to collection</button>
					<button type="button" className="danger" onClick={onDelete}>Delete</button>
				</div>
			</div>
			<ResponseViewer result={{ request: entry.request, response: entry.response }} />
		</section>
	);
}
