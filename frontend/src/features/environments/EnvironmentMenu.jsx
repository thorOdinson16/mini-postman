import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { menuKeyDown, restoreFocusIfBody } from "../../shared/utils/a11y.js";

export function EnvironmentMenu({ activeId, environments, onActivate, onClose, onManage, onNew, position }) {
	const reference = useRef(null);
	useEffect(() => {
		const opener = document.activeElement;
		const closeOutside = (event) => {
			if (!reference.current?.contains(event.target)) onClose();
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("pointerdown", closeOutside);
		document.addEventListener("keydown", closeOnEscape);
		reference.current?.querySelector("button")?.focus();
		return () => {
			document.removeEventListener("pointerdown", closeOutside);
			document.removeEventListener("keydown", closeOnEscape);
			restoreFocusIfBody(opener);
		};
	}, [onClose]);
	return createPortal(
		<div className="environment-menu" role="menu" aria-label="Environments" ref={reference} style={{ left: position.left, top: position.top }} onKeyDown={(event) => menuKeyDown(event, reference.current)}>
			<button role="menuitemradio" aria-checked={!activeId} onClick={() => { onClose(); onActivate(null); }}>
				<span className="environment-menu-check">{!activeId && <MaterialIcon size={18}>check</MaterialIcon>}</span>
				<span>No environment</span>
			</button>
			{environments.map((environment) => {
				const isActive = String(environment._id) === String(activeId);
				return (
					<button key={environment._id} role="menuitemradio" aria-checked={isActive} onClick={() => { onClose(); onActivate(environment._id); }}>
						<span className="environment-menu-check">{isActive && <MaterialIcon size={18}>check</MaterialIcon>}</span>
						<span>{environment.name}</span>
					</button>
				);
			})}
			<div className="environment-menu-divider" />
			<button role="menuitem" onClick={() => { onClose(); onManage(); }}><MaterialIcon size={18}>edit</MaterialIcon><span>Manage environments</span></button>
			<button role="menuitem" onClick={() => { onClose(); onNew(); }}><MaterialIcon size={18}>add</MaterialIcon><span>New environment</span></button>
		</div>,
		document.body,
	);
}
