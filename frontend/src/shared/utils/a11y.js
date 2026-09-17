export function createTabList({ ids, activeId, onChange, ariaLabel, idPrefix, listRef }) {
	const move = (event, nextIndex) => {
		event.preventDefault();
		const nextId = ids[nextIndex];
		onChange(nextId);
		requestAnimationFrame(() => listRef.current?.querySelector(`[data-tab="${nextId}"]`)?.focus());
	};
	const onKeyDown = (event) => {
		const index = ids.indexOf(activeId);
		if (event.key === "ArrowRight") move(event, (index + 1) % ids.length);
		else if (event.key === "ArrowLeft") move(event, (index - 1 + ids.length) % ids.length);
		else if (event.key === "Home") move(event, 0);
		else if (event.key === "End") move(event, ids.length - 1);
	};
	return {
		listProps: { role: "tablist", "aria-label": ariaLabel, ref: listRef, onKeyDown },
		tabProps: (id) => ({
			id: `${idPrefix}-tab-${id}`,
			"data-tab": String(id),
			role: "tab",
			tabIndex: id === activeId ? 0 : -1,
			"aria-selected": id === activeId,
			"aria-controls": `${idPrefix}-panel-${id}`,
		}),
		panelProps: (id) => ({ id: `${idPrefix}-panel-${id}`, role: "tabpanel", "aria-labelledby": `${idPrefix}-tab-${id}` }),
	};
}

export function menuKeyDown(event, container, selector = "button:not(:disabled)") {
	const items = [...(container?.querySelectorAll(selector) || [])];
	if (!items.length) return;
	const index = items.indexOf(document.activeElement);
	if (event.key === "ArrowDown") {
		event.preventDefault();
		items[(index + 1) % items.length].focus();
	} else if (event.key === "ArrowUp") {
		event.preventDefault();
		items[(index - 1 + items.length) % items.length].focus();
	} else if (event.key === "Home") {
		event.preventDefault();
		items[0].focus();
	} else if (event.key === "End") {
		event.preventDefault();
		items[items.length - 1].focus();
	}
}

export function restoreFocusIfBody(opener) {
	if (opener && opener.isConnected && document.activeElement === document.body) opener.focus();
}
