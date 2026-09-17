import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { identityInitials } from "../../shared/utils/identity.js";
import { applyTheme, readTheme } from "../../shared/utils/theme.js";

export function WorkspaceHeader({ account, onLogout, onSidebarToggle }) {
	const [theme, setTheme] = useState(readTheme);
	const [accountMenuOpen, setAccountMenuOpen] = useState(false);
	const accountMenuReference = useRef(null);
	useEffect(() => {
		if (!accountMenuOpen) return undefined;
		const closeMenu = (event) => {
			if (!accountMenuReference.current?.contains(event.target)) setAccountMenuOpen(false);
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") {
				setAccountMenuOpen(false);
				accountMenuReference.current?.querySelector(".account-button")?.focus();
			}
		};
		document.addEventListener("pointerdown", closeMenu);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeMenu);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [accountMenuOpen]);
	return (
		<header className="app-header">
			<button className="icon-button header-menu" aria-label="Toggle sidebar" title="Main menu" onClick={onSidebarToggle}><MaterialIcon size={24}>menu</MaterialIcon></button>
			<div className="brand" aria-label="Postman"><span>Postman</span></div>
			<div className="header-search" role="search"><MaterialIcon size={20}>search</MaterialIcon><input aria-label="Search" disabled placeholder="Search" type="search" /></div>
			<div className="header-actions">
				<div className="account-menu-anchor" ref={accountMenuReference}>
					<button className="account-button" aria-expanded={accountMenuOpen} aria-haspopup="menu" aria-label={`${account.name} account`} onClick={() => setAccountMenuOpen((open) => !open)}><span className="account-avatar">{identityInitials(account.name)}</span></button>
					{accountMenuOpen && (
						<div className="account-menu" role="menu" aria-label="Account menu">
							<div className="account-menu-identity">
								<span className="account-avatar account-avatar-large">{identityInitials(account.name)}</span>
								<strong>{account.name}</strong>
								<span>{account.email}</span>
							</div>
							<div className="account-menu-appearance" role="group" aria-label="Appearance">
								<span>Appearance</span>
								<div className="theme-toggle">
									{[
										{ value: "light", label: "Light", icon: "light_mode" },
										{ value: "dark", label: "Dark", icon: "dark_mode" },
									].map((option) => (
										<button key={option.value} type="button" aria-pressed={theme === option.value} onClick={() => setTheme(applyTheme(option.value))}><MaterialIcon size={18}>{option.icon}</MaterialIcon><span>{option.label}</span></button>
									))}
								</div>
							</div>
							<button className="account-signout-button" role="menuitem" onClick={() => { setAccountMenuOpen(false); onLogout(); }}><MaterialIcon size={19}>logout</MaterialIcon><span>Sign out</span></button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
