export function formatRelativeTime(value) {
	const time = new Date(value).getTime();
	if (Number.isNaN(time)) return "";
	const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
	if (seconds < 45) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(time).toLocaleDateString();
}
