import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon.jsx";

export function OptionsMenu({ ariaLabel, items, onClose, position }) {
	const reference = useRef(null);
	useEffect(() => {
		const closeOutside = (event) => {
			if (!reference.current?.contains(event.target)) onClose();
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("pointerdown", closeOutside);
		document.addEventListener("keydown", closeOnEscape);
		reference.current?.querySelector("button:not(:disabled)")?.focus();
		return () => {
			document.removeEventListener("pointerdown", closeOutside);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [onClose]);
	const onKeyDown = (event) => {
		const buttons = [...(reference.current?.querySelectorAll("button:not(:disabled)") || [])];
		if (!buttons.length) return;
		const index = buttons.indexOf(document.activeElement);
		if (event.key === "ArrowDown") {
			event.preventDefault();
			buttons[(index + 1) % buttons.length].focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			buttons[(index - 1 + buttons.length) % buttons.length].focus();
		} else if (event.key === "Home") {
			event.preventDefault();
			buttons[0].focus();
		} else if (event.key === "End") {
			event.preventDefault();
			buttons[buttons.length - 1].focus();
		}
	};
	return createPortal(
		<div className="collection-options-menu" role="menu" aria-label={ariaLabel} ref={reference} style={{ left: position.left, top: position.top }} onKeyDown={onKeyDown}>
			{items.map((item) => (
				<button key={item.label} className={item.danger ? "collection-options-danger" : ""} role="menuitem" disabled={item.disabled} onClick={() => { onClose(); item.onSelect(); }}>
					<MaterialIcon size={18}>{item.icon}</MaterialIcon>
					<span>{item.label}</span>
				</button>
			))}
		</div>,
		document.body,
	);
}
