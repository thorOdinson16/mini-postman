import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function CollectionOptionsMenu({ collection, onClose, onDelete, onRename, position }) {
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
		<div className="collection-options-menu" role="menu" aria-label={`${collection.name} options`} ref={reference} style={{ left: position.left, top: position.top }}>
			<button role="menuitem" onClick={() => { onClose(); onRename(collection); }}><MaterialIcon size={18}>edit</MaterialIcon><span>Rename</span></button>
			<button className="collection-options-danger" role="menuitem" onClick={() => { onClose(); onDelete(collection); }}><MaterialIcon size={18}>delete</MaterialIcon><span>Delete</span></button>
		</div>,
		document.body,
	);
}
