import { useCallback, useEffect, useState } from "react";
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
	useEffect(() => {
		loadWorkspaces();
	}, [loadWorkspaces]);
	useEffect(() => {
		if (selectedId) localStorage.setItem("postman-workspace-id", selectedId);
		else localStorage.removeItem("postman-workspace-id");
	}, [selectedId]);
	const toggleSidebar = () => {
		const next = !sidebarCollapsed;
		setSidebarCollapsed(next);
		localStorage.setItem("postman-sidebar", next ? "collapsed" : "expanded");
	};
	const selectedWorkspace = workspaces.find((workspace) => workspace._id === selectedId) || null;
	return (
		<div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
			<WorkspaceHeader account={account} onLogout={onLogout} onSidebarToggle={toggleSidebar} />
			<WorkspaceSidebar loading={loading} onSelect={setSelectedId} selectedId={selectedId} workspaces={workspaces} />
			{!sidebarCollapsed && <button className="sidebar-scrim" aria-label="Close sidebar" onClick={toggleSidebar} />}
			<main className="workspace-surface">
				{error ? (
					<div className="service-error" role="alert"><MaterialIcon size={20}>error_outline</MaterialIcon><span>{error}</span><button onClick={loadWorkspaces}>Retry</button></div>
				) : (
					<div className="workspace-empty">
						{selectedWorkspace && <p className="workspace-empty-eyebrow">{selectedWorkspace.name}</p>}
						<h1>No request open</h1>
						<p>Choose a request from the sidebar to send it and inspect the response.</p>
					</div>
				)}
			</main>
		</div>
	);
}
