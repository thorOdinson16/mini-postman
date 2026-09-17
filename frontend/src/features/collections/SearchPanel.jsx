import { useEffect, useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { collectionApi } from "./collection.api.js";
import { requestApi } from "../requests/request.api.js";

export function SearchPanel({ onSelectCollection, onSelectRequest, query, workspaceId }) {
	const [results, setResults] = useState({ collections: [], requests: [] });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		const term = query.trim();
		if (!workspaceId || !term) {
			setResults({ collections: [], requests: [] });
			setError("");
			setLoading(false);
			return undefined;
		}
		let active = true;
		setLoading(true);
		const handle = setTimeout(async () => {
			try {
				const [collections, requests] = await Promise.all([collectionApi.search(workspaceId, term), requestApi.search(workspaceId, term)]);
				if (!active) return;
				setResults({ collections, requests });
				setError("");
			} catch (searchError) {
				if (!active) return;
				setError(searchError.message);
			} finally {
				if (active) setLoading(false);
			}
		}, 250);
		return () => {
			active = false;
			clearTimeout(handle);
		};
	}, [query, workspaceId]);
	if (!query.trim()) return null;
	return (
		<div className="search-results" aria-label="Search results">
			{loading && <p className="sidebar-empty">Searching…</p>}
			{error && <p className="sidebar-error" role="alert">{error}</p>}
			{!loading && !error && !results.collections.length && !results.requests.length && <p className="sidebar-empty">No matches.</p>}
			{results.collections.map((collection) => (
				<button key={collection._id} type="button" className="search-result" onClick={() => onSelectCollection(String(collection._id))}>
					<MaterialIcon size={16}>folder</MaterialIcon>
					<span className="search-result-name">{collection.name}</span>
					<span className="search-result-kind">Collection</span>
				</button>
			))}
			{results.requests.map((item) => (
				<button key={item._id} type="button" className="search-result" onClick={() => onSelectRequest(String(item.collectionId), String(item._id))}>
					<span className={`method-badge method-${String(item.method).toLowerCase()}`}>{item.method}</span>
					<span className="search-result-name">{item.name}</span>
					<span className="search-result-kind">Request</span>
				</button>
			))}
		</div>
	);
}
