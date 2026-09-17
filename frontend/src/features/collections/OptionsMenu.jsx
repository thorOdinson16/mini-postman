import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

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
		reference.current?.querySelector("button")?.focus();
		return () => {
			document.removeEventListener("pointerdown", closeOutside);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [onClose]);
	return createPortal(
		<div className="collection-options-menu" role="menu" aria-label={ariaLabel} ref={reference} style={{ left: position.left, top: position.top }}>
			{items.map((item) => (
				<button key={item.label} className={item.danger ? "collection-options-danger" : ""} role="menuitem" onClick={() => { onClose(); item.onSelect(); }}>
					<MaterialIcon size={18}>{item.icon}</MaterialIcon>
					<span>{item.label}</span>
				</button>
			))}
		</div>,
		document.body,
	);
}
