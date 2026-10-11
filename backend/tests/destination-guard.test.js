import { describe, expect, test } from "bun:test";
import { executeRequest } from "../src/features/requests/http.js";
import { classifyAddress, resolveDestination } from "../src/shared/utils/destination-guard.js";

const lookupTo = (...addresses) => async () => addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

async function errorCode(promise) {
	try {
		await promise;
	} catch (error) {
		return error.code;
	}
	return null;
}

describe("classifyAddress", () => {
	const cases = [
		["8.8.8.8", "public"],
		["2606:4700::1", "public"],
		["172.32.0.1", "public"],
		["127.0.0.1", "private"],
		["10.1.2.3", "private"],
		["172.16.0.1", "private"],
		["192.168.1.1", "private"],
		["100.64.0.1", "private"],
		["::1", "private"],
		["fc00::1", "private"],
		["::ffff:7f00:1", "private"],
		["::ffff:127.0.0.1", "private"],
		["64:ff9b::7f00:1", "private"],
		["169.254.169.254", "blocked"],
		["fe80::1", "blocked"],
		["0.0.0.0", "blocked"],
		["::", "blocked"],
		["224.0.0.1", "blocked"],
		["255.255.255.255", "blocked"],
	];
	for (const [address, expected] of cases) {
		test(`${address} is ${expected}`, () => expect(classifyAddress(address)).toBe(expected));
	}
});

describe("resolveDestination", () => {
	test("refuses a hostname that resolves to a loopback address", async () => {
		const code = await errorCode(resolveDestination("http://app.example.com/", { lookup: lookupTo("127.0.0.1") }));
		expect(code).toBe("BLOCKED_REQUEST_URL");
	});

	test("refuses when any resolved address is blocked", async () => {
		const code = await errorCode(resolveDestination("http://app.example.com/", { lookup: lookupTo("93.184.216.34", "10.0.0.5") }));
		expect(code).toBe("BLOCKED_REQUEST_URL");
	});

	test("refuses IP literals in alternate encodings", async () => {
		for (const url of ["http://2130706433/", "http://0x7f.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]/"]) {
			expect(await errorCode(resolveDestination(url))).toBe("BLOCKED_REQUEST_URL");
		}
	});

	test("refuses credentials in the URL and non-http schemes", async () => {
		const withCredentials = resolveDestination("http://user:pass@example.com/", { lookup: lookupTo("93.184.216.34") });
		expect(await errorCode(withCredentials)).toBe("BLOCKED_REQUEST_URL");
		expect(await errorCode(resolveDestination("file:///etc/passwd"))).toBe("INVALID_REQUEST_URL");
	});

	test("allows a public address", async () => {
		const destination = await resolveDestination("https://example.com/path", { lookup: lookupTo("93.184.216.34") });
		expect(destination.address).toBe("93.184.216.34");
	});

	test("allows private ranges only when enabled and never link-local", async () => {
		const options = { allowPrivate: true };
		expect((await resolveDestination("http://127.0.0.1:3000/", options)).address).toBe("127.0.0.1");
		expect(await errorCode(resolveDestination("http://169.254.169.254/latest/meta-data", options))).toBe("BLOCKED_REQUEST_URL");
	});
});

describe("executeRequest redirects", () => {
	const resolved = { method: "GET", url: "http://example.com/start", headers: [], queryParams: [], body: { mode: "none" } };
	const options = { allowPrivate: false, lookup: lookupTo("93.184.216.34") };

	test("does not follow a redirect to a blocked destination", async () => {
		let calls = 0;
		const fetchImpl = async () => {
			calls += 1;
			return new Response(null, { status: 302, headers: { location: "http://127.0.0.1:8000/api/v1/health" } });
		};
		const result = await executeRequest(resolved, { type: "none" }, { ...options, fetchImpl });
		expect(calls).toBe(1);
		expect(result.ok).toBe(false);
		expect(result.error).toContain("not allowed");
	});

	test("stops after too many redirects", async () => {
		const fetchImpl = async () => new Response(null, { status: 302, headers: { location: "http://example.com/again" } });
		const result = await executeRequest(resolved, { type: "none" }, { ...options, fetchImpl });
		expect(result.error).toContain("redirected more than");
	});

	test("drops credentials when a redirect leaves the origin", async () => {
		const seen = [];
		const fetchImpl = async (url, init) => {
			seen.push(new Headers(init.headers).get("authorization"));
			if (seen.length === 1) return new Response(null, { status: 302, headers: { location: "http://other.example.org/next" } });
			return new Response("ok", { status: 200 });
		};
		const auth = { type: "bearer", bearer: { token: "secret" } };
		const result = await executeRequest(resolved, auth, { ...options, fetchImpl });
		expect(result.status).toBe(200);
		expect(seen).toEqual(["Bearer secret", null]);
	});
});
