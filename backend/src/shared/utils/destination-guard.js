import dns from "node:dns/promises";
import net from "node:net";
import { AppError } from "../errors/app-error.js";

const ALWAYS_BLOCKED_V4 = [
	[0, 0, 0, 0, 8],
	[169, 254, 0, 0, 16],
	[224, 0, 0, 0, 4],
	[240, 0, 0, 0, 4],
];

const PRIVATE_V4 = [
	[10, 0, 0, 0, 8],
	[100, 64, 0, 0, 10],
	[127, 0, 0, 0, 8],
	[172, 16, 0, 0, 12],
	[192, 0, 0, 0, 24],
	[192, 168, 0, 0, 16],
	[198, 18, 0, 0, 15],
];

function toInt(octets) {
	return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function inRange(octets, [a, b, c, d, bits]) {
	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	return (toInt(octets) & mask) === (toInt([a, b, c, d]) & mask);
}

function parseIPv6(address) {
	const withoutZone = address.split("%")[0];
	const [head, tail = null] = withoutZone.split("::");
	const expand = (part) =>
		part === "" ? [] : part.split(":").flatMap((group) => {
			if (group.includes(".")) {
				const octets = group.split(".").map(Number);
				return [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
			}
			return [parseInt(group, 16)];
		});
	const headGroups = expand(head);
	if (tail === null) return headGroups;
	const tailGroups = expand(tail);
	return [...headGroups, ...new Array(8 - headGroups.length - tailGroups.length).fill(0), ...tailGroups];
}

function embeddedIPv4(groups) {
	const leadingZero = groups.slice(0, 5).every((group) => group === 0);
	const mapped = leadingZero && groups[5] === 0xffff;
	const compatible = leadingZero && groups[5] === 0 && (groups[6] !== 0 || groups[7] > 1);
	const nat64 = groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0);
	if (!mapped && !compatible && !nat64) return null;
	return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff];
}

function classifyV4(octets) {
	if (ALWAYS_BLOCKED_V4.some((range) => inRange(octets, range))) return "blocked";
	if (PRIVATE_V4.some((range) => inRange(octets, range))) return "private";
	return "public";
}

function classifyV6(groups) {
	const embedded = embeddedIPv4(groups);
	if (embedded) return classifyV4(embedded);
	if (groups.every((group) => group === 0)) return "blocked";
	if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) return "private";
	if ((groups[0] & 0xffc0) === 0xfe80) return "blocked";
	if ((groups[0] & 0xff00) === 0xff00) return "blocked";
	if ((groups[0] & 0xfe00) === 0xfc00) return "private";
	if ((groups[0] & 0xffc0) === 0xfec0) return "private";
	return "public";
}

export function classifyAddress(address) {
	const family = net.isIP(address);
	if (family === 4) return classifyV4(address.split(".").map(Number));
	if (family === 6) return classifyV6(parseIPv6(address));
	return "blocked";
}

function isAllowed(address, allowPrivate) {
	const kind = classifyAddress(address);
	return kind === "public" || (kind === "private" && allowPrivate);
}

function blocked() {
	return new AppError(400, "BLOCKED_REQUEST_URL", "Requests to this destination are not allowed.");
}

export async function resolveDestination(urlString, { allowPrivate = false, lookup = dns.lookup } = {}) {
	let url;
	try {
		url = new URL(urlString);
	} catch {
		throw new AppError(400, "INVALID_REQUEST_URL", "Provide a valid absolute request URL.");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new AppError(400, "INVALID_REQUEST_URL", "Only http and https request URLs are supported.");
	}
	if (url.username || url.password) throw blocked();
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	let addresses;
	if (net.isIP(hostname)) {
		addresses = [hostname];
	} else {
		try {
			addresses = (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
		} catch {
			throw new AppError(400, "UNRESOLVED_REQUEST_HOST", "The request host could not be resolved.");
		}
	}
	if (addresses.length === 0 || !addresses.every((address) => isAllowed(address, allowPrivate))) throw blocked();
	return { url, hostname, address: addresses[0] };
}
