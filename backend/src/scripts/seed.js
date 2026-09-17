import dotenv from "dotenv";

dotenv.config({ quiet: true });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { WorkspaceAccount } from "../features/auth/workspace-account.model.js";
import { Collection } from "../features/collections/collection.model.js";
import { Environment } from "../features/environments/environment.model.js";
import { HistoryEntry } from "../features/history/history-entry.model.js";
import { Request } from "../features/requests/request.model.js";
import { Workspace } from "../features/workspaces/workspace.model.js";
import { loadConfig } from "../shared/config/index.js";
import { buildVariableMap, resolveAuth, resolveRequestParts } from "../shared/utils/variables.js";

const config = loadConfig();

const MINUTE = 60000;
const now = new Date();
const minutesAgo = (minutes) => new Date(now.getTime() - minutes * MINUTE);

const DEMO_ACCOUNT = { name: "Alex Morgan", email: "alex.morgan@postman.app" };
const DEMO_PASSWORD = "password123";
const PASSWORD_ROUNDS = 12;

const kv = (key, value, description = "") => ({ key, value, enabled: true, description });
const noAuth = () => ({ type: "none" });
const bearer = (token) => ({ type: "bearer", bearer: { token } });
const basic = (username, password) => ({ type: "basic", basic: { username, password } });
const apiKey = (key, value, addTo = "header") => ({ type: "apiKey", apiKey: { key, value, addTo } });
const jsonBody = (raw) => ({ mode: "json", raw, formData: [], urlEncoded: [] });
const textBody = (raw) => ({ mode: "text", raw, formData: [], urlEncoded: [] });
const noneBody = () => ({ mode: "none", raw: "", formData: [], urlEncoded: [] });
const formBody = (pairs) => ({ mode: "urlEncoded", raw: "", formData: [], urlEncoded: pairs.map(([key, value]) => kv(key, value)) });

function response({ status, statusText, headers = [["content-type", "application/json"]], body = "", durationMs = 0, contentType = "application/json", truncated = false, error = "" }) {
	return {
		status,
		statusText,
		ok: status >= 200 && status < 300,
		headers: headers.map(([key, value]) => ({ key, value })),
		body,
		size: Buffer.byteLength(body, "utf8"),
		durationMs,
		contentType,
		truncated,
		error,
	};
}

const workspaceRows = [
	{ key: "personal", name: "Personal", description: "Everyday API testing and experiments.", isDefault: true },
	{ key: "storefront", name: "Storefront API", description: "Customer-facing storefront services.", isDefault: false },
	{ key: "operations", name: "Operations", description: "Monitoring and webhook operations.", isDefault: false },
];

const environmentRows = [
	{
		workspace: "personal",
		name: "Local",
		isActive: true,
		variables: [
			kv("baseUrl", "http://localhost:4000", "Local API base URL"),
			kv("token", "personal-local-token", "Local bearer token"),
			kv("apiKey", "personal-local-api-key", "Local API key"),
			kv("username", "alex@example.com", "Local test account"),
			kv("password", "example-password", "Local test password"),
		],
	},
	{
		workspace: "personal",
		name: "Production",
		isActive: false,
		variables: [
			kv("baseUrl", "https://api.example.com", "Production API base URL"),
			kv("token", "personal-production-token", "Production bearer token"),
			kv("apiKey", "personal-production-api-key", "Production API key"),
			kv("username", "alex@example.com", "Production account"),
			kv("password", "example-password", "Production password"),
		],
	},
	{
		workspace: "storefront",
		name: "Staging",
		isActive: true,
		variables: [
			kv("baseUrl", "https://staging.api.example.com", "Staging API base URL"),
			kv("token", "storefront-staging-token", "Staging bearer token"),
			kv("apiKey", "storefront-staging-api-key", "Staging API key"),
			kv("username", "qa.user@example.com", "Staging account"),
			kv("password", "example-password", "Staging password"),
		],
	},
	{
		workspace: "storefront",
		name: "Production",
		isActive: false,
		variables: [
			kv("baseUrl", "https://api.example.com", "Production API base URL"),
			kv("token", "storefront-production-token", "Production bearer token"),
			kv("apiKey", "storefront-production-api-key", "Production API key"),
			kv("username", "qa.user@example.com", "Production account"),
			kv("password", "example-password", "Production password"),
		],
	},
	{
		workspace: "operations",
		name: "Local",
		isActive: true,
		variables: [
			kv("baseUrl", "http://localhost:4000", "Local operations base URL"),
			kv("token", "operations-local-token", "Local operations token"),
			kv("apiKey", "operations-local-api-key", "Local operations API key"),
			kv("username", "ops.user@example.com", "Operations account"),
			kv("password", "example-password", "Operations password"),
		],
	},
];

const collectionRows = [
	{
		key: "personal-auth",
		workspace: "personal",
		name: "Authentication",
		description: "Sign-in and token lifecycle.",
		auth: noAuth(),
		folders: [],
		requests: [
			{ name: "Sign in", method: "POST", url: "{{baseUrl}}/auth/sign-in", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "email": "{{username}}",\n  "password": "{{password}}"\n}`), auth: noAuth() },
			{ name: "Refresh token", method: "POST", url: "{{baseUrl}}/auth/refresh", auth: bearer("{{token}}") },
			{ name: "Introspect token", method: "POST", url: "{{baseUrl}}/auth/introspect", auth: basic("{{username}}", "{{password}}") },
			{ name: "Sign out", method: "POST", url: "{{baseUrl}}/auth/sign-out", auth: apiKey("X-Api-Key", "{{apiKey}}") },
		],
	},
	{
		key: "personal-health",
		workspace: "personal",
		name: "Health",
		description: "Service liveness and readiness checks.",
		auth: noAuth(),
		folders: [],
		requests: [
			{ name: "Service health", method: "GET", url: "{{baseUrl}}/health", auth: noAuth() },
			{ name: "Readiness", method: "GET", url: "{{baseUrl}}/ready", auth: noAuth() },
		],
	},
	{
		key: "storefront-catalog",
		workspace: "storefront",
		name: "Catalog",
		description: "Product and category browsing.",
		auth: noAuth(),
		folders: ["Products", "Categories"],
		requests: [
			{ folder: "Products", name: "List products", method: "GET", url: "{{baseUrl}}/products", queryParams: [kv("page", "1"), kv("size", "20")], auth: noAuth() },
			{ folder: "Products", name: "Get product", method: "GET", url: "{{baseUrl}}/products/{{productId}}", auth: noAuth() },
			{ folder: "Products", name: "Search products", method: "GET", url: "{{baseUrl}}/products/search", queryParams: [kv("q", "desk lamp")], auth: noAuth() },
			{ folder: "Products", name: "Create product", method: "POST", url: "{{baseUrl}}/products", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "name": "Desk lamp",\n  "price": 4200,\n  "currency": "USD",\n  "categoryId": "{{categoryId}}"\n}`), auth: bearer("{{token}}") },
			{ folder: "Categories", name: "List categories", method: "GET", url: "{{baseUrl}}/categories", auth: noAuth() },
		],
	},
	{
		key: "storefront-cart",
		workspace: "storefront",
		name: "Cart",
		description: "Shopping cart operations.",
		auth: noAuth(),
		folders: [],
		requests: [
			{ name: "Add to cart", method: "POST", url: "{{baseUrl}}/cart/items", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "productId": "{{productId}}",\n  "quantity": 2\n}`), auth: noAuth() },
			{ name: "Update quantity", method: "PATCH", url: "{{baseUrl}}/cart/items/{{cartItemId}}", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "quantity": 3\n}`), auth: noAuth() },
			{ name: "Remove item", method: "DELETE", url: "{{baseUrl}}/cart/items/{{cartItemId}}", auth: noAuth() },
			{ name: "Apply coupon", method: "POST", url: "{{baseUrl}}/cart/coupon", headers: [kv("Content-Type", "application/x-www-form-urlencoded")], body: formBody([["code", "SEED10"], ["cartId", "{{cartId}}"]]), auth: noAuth() },
		],
	},
	{
		key: "storefront-orders",
		workspace: "storefront",
		name: "Orders",
		description: "Checkout and order retrieval.",
		auth: noAuth(),
		folders: [],
		requests: [
			{ name: "Create order", method: "POST", url: "{{baseUrl}}/orders", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "items": [\n    { "productId": "{{productId}}", "quantity": 2 }\n  ],\n  "note": "Leave at the front desk."\n}`), auth: bearer("{{token}}") },
			{ name: "Get order", method: "GET", url: "{{baseUrl}}/orders/{{orderId}}", auth: bearer("{{token}}") },
			{ name: "List orders", method: "GET", url: "{{baseUrl}}/orders", queryParams: [kv("status", "open")], auth: bearer("{{token}}") },
		],
	},
	{
		key: "operations-monitoring",
		workspace: "operations",
		name: "Monitoring",
		description: "Incident tracking with collection-level authorization.",
		auth: bearer("{{token}}"),
		folders: [],
		requests: [
			{ name: "List incidents", method: "GET", url: "{{baseUrl}}/incidents", auth: noAuth() },
			{ name: "Create incident", method: "POST", url: "{{baseUrl}}/incidents", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "title": "Elevated checkout latency",\n  "severity": "high",\n  "service": "checkout-api"\n}`), auth: bearer("{{token}}") },
			{ name: "Incident timeline", method: "GET", url: "{{baseUrl}}/incidents/{{incidentId}}", auth: noAuth() },
		],
	},
	{
		key: "operations-webhooks",
		workspace: "operations",
		name: "Webhooks",
		description: "Outbound webhook registration and delivery tests.",
		auth: noAuth(),
		folders: [],
		requests: [
			{ name: "Test webhook", method: "POST", url: "{{baseUrl}}/webhooks/test", headers: [kv("Content-Type", "text/plain")], body: textBody("event={{unresolved}}&source=seed"), auth: noAuth() },
			{ name: "Register webhook", method: "POST", url: "{{baseUrl}}/webhooks", headers: [kv("Content-Type", "application/json")], body: jsonBody(`{\n  "url": "https://hooks.example.com/orders",\n  "events": ["order.created", "order.cancelled"]\n}`), auth: bearer("{{token}}") },
		],
	},
];

const historyRows = [
	{
		collection: "personal-auth",
		request: "Sign in",
		workspace: "personal",
		environment: "Local",
		minutesAgo: 6,
		response: response({ status: 200, statusText: "OK", body: `{\n  "token": "personal-local-token",\n  "expiresIn": 3600\n}`, durationMs: 118 }),
	},
	{
		collection: "personal-health",
		request: "Service health",
		workspace: "personal",
		environment: "Local",
		minutesAgo: 14,
		response: response({ status: 200, statusText: "OK", body: `{\n  "status": "ok",\n  "database": "connected"\n}`, durationMs: 32 }),
	},
	{
		collection: "storefront-catalog",
		request: "List products",
		workspace: "storefront",
		environment: "Staging",
		minutesAgo: 22,
		response: response({ status: 200, statusText: "OK", body: `{\n  "items": [\n    { "id": "prod_1041", "name": "Desk lamp", "price": 4200 },\n    { "id": "prod_1042", "name": "Wall clock", "price": 3100 }\n  ],\n  "total": 2\n}`, durationMs: 236 }),
	},
	{
		collection: "storefront-catalog",
		request: "Get product",
		workspace: "storefront",
		environment: "Staging",
		minutesAgo: 31,
		response: response({ status: 404, statusText: "Not Found", body: `{\n  "error": "product_not_found"\n}`, durationMs: 88 }),
	},
	{
		collection: "storefront-orders",
		request: "Create order",
		workspace: "storefront",
		environment: "Staging",
		minutesAgo: 47,
		response: response({ status: 201, statusText: "Created", body: `{\n  "id": "order_5521",\n  "status": "open"\n}`, durationMs: 412 }),
	},
	{
		collection: "storefront-cart",
		request: "Add to cart",
		workspace: "storefront",
		environment: "Staging",
		minutesAgo: 58,
		response: response({ status: 201, statusText: "Created", body: `{\n  "id": "cart_8830",\n  "items": 2\n}`, durationMs: 176 }),
	},
	{
		collection: "storefront-catalog",
		request: "Search products",
		workspace: "storefront",
		environment: "Staging",
		minutesAgo: 73,
		response: response({ status: 200, statusText: "OK", body: `{\n  "items": [{ "id": "prod_1041", "name": "Desk lamp" }],\n  "total": 1\n}`, durationMs: 204 }),
	},
	{
		collection: "operations-monitoring",
		request: "List incidents",
		workspace: "operations",
		environment: "Local",
		minutesAgo: 96,
		response: response({ status: 200, statusText: "OK", body: `{\n  "items": [\n    { "id": "inc_204", "severity": "high", "status": "investigating" }\n  ]\n}`, durationMs: 141 }),
	},
	{
		collection: "operations-monitoring",
		request: "Create incident",
		workspace: "operations",
		environment: "Local",
		minutesAgo: 118,
		response: response({ status: 201, statusText: "Created", body: `{\n  "id": "inc_205",\n  "status": "investigating"\n}`, durationMs: 318 }),
	},
	{
		collection: "operations-webhooks",
		request: "Test webhook",
		workspace: "operations",
		environment: "Local",
		minutesAgo: 143,
		response: response({ status: 500, statusText: "Internal Server Error", body: `{\n  "error": "webhook_delivery_failed"\n}`, durationMs: 74 }),
	},
	{
		collection: "personal-auth",
		request: "Refresh token",
		workspace: "personal",
		environment: "Local",
		minutesAgo: 176,
		response: response({ status: 401, statusText: "Unauthorized", body: `{\n  "error": "token_expired"\n}`, durationMs: 61 }),
	},
	{
		collection: "storefront-orders",
		request: "Get order",
		workspace: "storefront",
		environment: "Production",
		minutesAgo: 205,
		response: response({ status: 0, statusText: "", headers: [], body: "", durationMs: 9, contentType: "", error: "Unable to connect. Is the computer able to access the url?" }),
	},
	{
		collection: "operations-monitoring",
		request: "Incident timeline",
		workspace: "operations",
		environment: "Local",
		minutesAgo: 240,
		response: response({ status: 200, statusText: "OK", body: `[{"at":"2026-09-16T10:00:00Z","message":"Alert triggered"},{"at":"2026-09-16T10:04:00Z","message":"On-call acknowledged"},{"at":"2026-09-16T10:19:00Z","message":"Mitigation applied"}`, durationMs: 268, truncated: true }),
	},
];

async function clearDatabase() {
	console.log("Clearing existing collections...");
	await Promise.all([
		HistoryEntry.deleteMany({}),
		Request.deleteMany({}),
		Environment.deleteMany({}),
		Collection.deleteMany({}),
		Workspace.deleteMany({}),
		WorkspaceAccount.deleteMany({}),
	]);
	await Promise.all([
		HistoryEntry.syncIndexes(),
		Request.syncIndexes(),
		Environment.syncIndexes(),
		Collection.syncIndexes(),
		Workspace.syncIndexes(),
		WorkspaceAccount.syncIndexes(),
	]);
}

async function seedAccounts() {
	console.log("\nSeeding sign-in accounts...");
	const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_ROUNDS);
	const accounts = await WorkspaceAccount.create([{ ...DEMO_ACCOUNT, passwordHash }]);
	console.log(`  Created ${accounts.length} account`);
	return accounts;
}

async function seedWorkspaces() {
	console.log("\nSeeding workspaces...");
	const workspaces = await Workspace.create(workspaceRows.map(({ key, ...workspace }) => workspace));
	console.log(`  Created ${workspaces.length} workspaces`);
	return { workspaces, byKey: new Map(workspaceRows.map((row, index) => [row.key, workspaces[index]])) };
}

async function seedEnvironments(workspaces) {
	console.log("\nSeeding environments...");
	const rows = environmentRows.map((row) => ({
		workspaceId: workspaces.byKey.get(row.workspace)._id,
		name: row.name,
		variables: row.variables,
		isActive: row.isActive,
	}));
	const environments = await Environment.create(rows);
	console.log(`  Created ${environments.length} environments`);
	return environments;
}

async function seedCollections(workspaces) {
	console.log("\nSeeding collections and folders...");
	const collections = [];
	const folderIdByKey = new Map();
	for (const row of collectionRows) {
		const folders = (row.folders || []).map((name, index) => ({ name, parentId: null, order: index }));
		const collection = await Collection.create({
			workspaceId: workspaces.byKey.get(row.workspace)._id,
			name: row.name,
			description: row.description,
			auth: row.auth,
			folders,
			order: collections.filter((entry) => entry.row.workspace === row.workspace).length,
		});
		collections.push({ row, collection });
		for (const folder of collection.folders) folderIdByKey.set(`${row.key}/${folder.name}`, folder._id);
	}
	console.log(`  Created ${collections.length} collections with ${folderIdByKey.size} folders`);
	return { collections, folderIdByKey };
}

async function seedRequests(collections) {
	console.log("\nSeeding requests...");
	const rows = [];
	const byKey = new Map();
	for (const { row, collection } of collections.collections) {
		const orderByScope = new Map();
		for (const request of row.requests) {
			const folderId = request.folder ? collections.folderIdByKey.get(`${row.key}/${request.folder}`) : null;
			if (request.folder && !folderId) throw new Error(`Seed folder "${request.folder}" was not created for collection "${row.name}".`);
			const scope = folderId ? String(folderId) : "root";
			const order = orderByScope.get(scope) ?? 0;
			orderByScope.set(scope, order + 1);
			const document = {
				collectionId: collection._id,
				folderId,
				name: request.name,
				description: request.description ?? "",
				method: request.method,
				url: request.url,
				queryParams: request.queryParams ?? [],
				headers: request.headers ?? [],
				body: request.body ?? noneBody(),
				auth: request.auth ?? noAuth(),
				order,
			};
			rows.push(document);
			byKey.set(`${row.key}/${request.name}`, document);
		}
	}
	const requests = await Request.create(rows);
	console.log(`  Created ${requests.length} requests`);
	const byKeyCreated = new Map([...byKey.keys()].map((key, index) => [key, requests[index]]));
	return { requests, byKey: byKeyCreated };
}

function buildHistory(workspaces, environments, collections, requests) {
	const environmentByName = new Map(environments.map((environment) => [`${String(environment.workspaceId)}|${environment.name}`, environment]));
	const collectionAuthByKey = new Map(collections.collections.map(({ row, collection }) => [row.key, collection.auth]));
	return historyRows.map((entry) => {
		const workspace = workspaces.byKey.get(entry.workspace);
		const environment = environmentByName.get(`${String(workspace._id)}|${entry.environment}`);
		if (!environment) throw new Error(`Seed history references a missing environment "${entry.environment}".`);
		const request = requests.byKey.get(`${entry.collection}/${entry.request}`);
		if (!request) throw new Error(`Seed history references a missing request "${entry.request}".`);
		const variables = buildVariableMap(environment.variables);
		const resolved = resolveRequestParts(request, variables);
		resolved.auth =
			request.auth && request.auth.type !== "none"
				? resolved.auth
				: resolveAuth(collectionAuthByKey.get(entry.collection) ?? { type: "none" }, variables);
		return {
			workspaceId: workspace._id,
			environmentId: environment._id,
			request: {
				method: resolved.method,
				url: resolved.url,
				rawUrl: resolved.rawUrl,
				queryParams: resolved.queryParams,
				headers: resolved.headers,
				body: resolved.body,
				auth: resolved.auth,
			},
			response: entry.response,
			sentAt: minutesAgo(entry.minutesAgo),
		};
	});
}

function validateSeed(workspaces, environments, collections, requests, history) {
	const fail = (reason) => {
		throw new Error(`Seed data is incoherent: ${reason}.`);
	};

	if (workspaces.workspaces.filter((workspace) => workspace.isDefault).length !== 1) fail("there must be exactly one default workspace");

	for (const workspace of workspaces.workspaces) {
		const active = environments.filter((environment) => String(environment.workspaceId) === String(workspace._id) && environment.isActive);
		if (active.length !== 1) fail(`workspace "${workspace.name}" has ${active.length} active environments`);
	}

	const collectionById = new Map(collections.collections.map(({ collection }) => [String(collection._id), collection]));
	const orders = new Set();
	for (const request of requests.requests) {
		const collection = collectionById.get(String(request.collectionId));
		if (!collection) fail(`request "${request.name}" references a missing collection`);
		if (request.folderId && !collection.folders.some((folder) => String(folder._id) === String(request.folderId))) {
			fail(`request "${request.name}" references a foreign folder`);
		}
		const scope = `${request.collectionId}|${request.folderId ?? "root"}|${request.order}`;
		if (orders.has(scope)) fail(`request "${request.name}" duplicates an order position`);
		orders.add(scope);
		if (!request.url) fail(`request "${request.name}" has no URL`);
	}

	const workspaceById = new Map(workspaces.workspaces.map((workspace) => [String(workspace._id), workspace]));
	for (const entry of history) {
		if (!workspaceById.has(String(entry.workspaceId))) fail("history references a missing workspace");
		if (entry.environmentId) {
			const environment = environments.find((item) => String(item._id) === String(entry.environmentId));
			if (!environment || String(environment.workspaceId) !== String(entry.workspaceId)) fail("history environment does not belong to its workspace");
		}
		if (!entry.request?.url) fail("history snapshot has no URL");
		if (typeof entry.response?.status !== "number") fail("history response status is invalid");
	}
}

async function seed() {
	try {
		console.log("========================================");
		console.log("Database Seeding");
		console.log("========================================\n");

		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.mongodbUri);
		console.log("Connected to MongoDB");

		await clearDatabase();
		await seedAccounts();

		const workspaces = await seedWorkspaces();
		const environments = await seedEnvironments(workspaces);
		const collections = await seedCollections(workspaces);
		const requests = await seedRequests(collections);
		const history = buildHistory(workspaces, environments, collections, requests);
		validateSeed(workspaces, environments, collections, requests, history);
		const historyEntries = await HistoryEntry.create(history);
		console.log(`\nSeeding history...\n  Created ${historyEntries.length} history entries`);

		const counts = await Promise.all([
			Workspace.countDocuments(),
			Environment.countDocuments(),
			Collection.countDocuments(),
			Request.countDocuments(),
			HistoryEntry.countDocuments(),
			WorkspaceAccount.countDocuments(),
		]);

		console.log("\n========================================");
		console.log("Seeding completed successfully!");
		console.log("========================================");
		console.log("\nCollection counts:");
		console.log(`  Workspaces:   ${counts[0]}`);
		console.log(`  Environments: ${counts[1]}`);
		console.log(`  Collections:  ${counts[2]}`);
		console.log(`  Requests:     ${counts[3]}`);
		console.log(`  History:      ${counts[4]}`);
		console.log(`  Accounts:     ${counts[5]}`);
		console.log("\nSeeded workspaces:");
		for (const workspace of workspaceRows) console.log(`  ${workspace.isDefault ? "*" : " "} ${workspace.name}`);
		console.log("\nDemo account:");
		console.log(`  Email: ${DEMO_ACCOUNT.email} | Password: ${DEMO_PASSWORD}`);
		console.log("========================================\n");
	} catch (error) {
		console.error("\nSeeding failed:", error.message);
		console.error(error.stack);
		process.exit(1);
	} finally {
		await mongoose.disconnect();
		console.log("Disconnected from MongoDB");
	}
}

seed();
