import { useEffect, useState } from "react";
import { authApi } from "./features/auth/auth.api.js";
import { WorkspaceLogin } from "./features/auth/WorkspaceLogin.jsx";
import { WorkspaceShell } from "./features/workspaces/WorkspaceShell.jsx";
import { hasSessionToken, setSessionToken } from "./shared/api/client.js";

function AppBootScreen() {
	return (
		<main className="app-boot" aria-label="Opening Postman" role="status">
			<div className="app-boot-brand">Postman</div>
			<div className="app-boot-progress" aria-hidden="true"><span /></div>
		</main>
	);
}

export default function App() {
	const [account, setAccount] = useState(null);
	const [authLoading, setAuthLoading] = useState(false);
	const [bootstrapping, setBootstrapping] = useState(true);
	const [authError, setAuthError] = useState("");
	useEffect(() => {
		const expire = (event) => {
			setSessionToken("");
			setAccount(null);
			setAuthError(event.detail || "Your Postman session has expired.");
		};
		window.addEventListener("postman-session-expired", expire);
		return () => window.removeEventListener("postman-session-expired", expire);
	}, []);
	useEffect(() => {
		let active = true;
		const restore = async () => {
			if (!hasSessionToken()) {
				if (active) setBootstrapping(false);
				return;
			}
			try {
				const session = await authApi.session();
				if (!active) return;
				setAccount(session.account);
				setAuthError("");
			} catch (error) {
				if (!active) return;
				setSessionToken("");
				setAuthError(error.message);
			} finally {
				if (active) setBootstrapping(false);
			}
		};
		restore();
		return () => {
			active = false;
		};
	}, []);
	const login = async (email, password) => {
		try {
			setAuthLoading(true);
			setAuthError("");
			const result = await authApi.login(email, password);
			setSessionToken(result.token);
			setAccount(result.account);
		} catch (error) {
			setAuthError(error.message);
		} finally {
			setAuthLoading(false);
		}
	};
	const logout = async () => {
		try {
			if (hasSessionToken()) await authApi.logout();
		} catch {}
		setSessionToken("");
		setAccount(null);
		setAuthError("");
	};
	if (bootstrapping) return <AppBootScreen />;
	if (!account) return <WorkspaceLogin error={authError} loading={authLoading} onLogin={login} />;
	return <WorkspaceShell account={account} onLogout={logout} />;
}
