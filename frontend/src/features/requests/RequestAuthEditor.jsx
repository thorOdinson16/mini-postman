import { SelectMenu } from "../../shared/components/SelectMenu.jsx";

const TYPES = [
	{ value: "none", label: "No Auth" },
	{ value: "bearer", label: "Bearer Token" },
	{ value: "basic", label: "Basic Auth" },
	{ value: "apiKey", label: "API Key" },
];
const ADD_TO = [
	{ value: "header", label: "Header" },
	{ value: "query", label: "Query Params" },
];

export function RequestAuthEditor({ auth, onChange }) {
	const set = (patch) => onChange({ ...auth, ...patch });
	return (
		<section className="auth-editor">
			<div className="auth-row">
				<label>Type</label>
				<SelectMenu ariaLabel="Auth type" className="auth-type-select" onChange={(type) => set({ type })} options={TYPES} value={auth.type} />
			</div>
			{auth.type === "bearer" && (
				<div className="auth-row">
					<label htmlFor="auth-token">Token</label>
					<input id="auth-token" className="auth-input" placeholder="Enter bearer token" value={auth.bearer.token} onChange={(event) => set({ bearer: { ...auth.bearer, token: event.target.value } })} />
				</div>
			)}
			{auth.type === "basic" && (
				<>
					<div className="auth-row">
						<label htmlFor="auth-username">Username</label>
						<input id="auth-username" className="auth-input" placeholder="Username" value={auth.basic.username} onChange={(event) => set({ basic: { ...auth.basic, username: event.target.value } })} />
					</div>
					<div className="auth-row">
						<label htmlFor="auth-password">Password</label>
						<input id="auth-password" className="auth-input" placeholder="Password" value={auth.basic.password} onChange={(event) => set({ basic: { ...auth.basic, password: event.target.value } })} />
					</div>
				</>
			)}
			{auth.type === "apiKey" && (
				<>
					<div className="auth-row">
						<label htmlFor="auth-key">Key</label>
						<input id="auth-key" className="auth-input" placeholder="Key" value={auth.apiKey.key} onChange={(event) => set({ apiKey: { ...auth.apiKey, key: event.target.value } })} />
					</div>
					<div className="auth-row">
						<label htmlFor="auth-value">Value</label>
						<input id="auth-value" className="auth-input" placeholder="Value" value={auth.apiKey.value} onChange={(event) => set({ apiKey: { ...auth.apiKey, value: event.target.value } })} />
					</div>
					<div className="auth-row">
						<label>Add to</label>
						<SelectMenu ariaLabel="Add API key to" className="auth-addto-select" onChange={(addTo) => set({ apiKey: { ...auth.apiKey, addTo } })} options={ADD_TO} value={auth.apiKey.addTo} />
					</div>
				</>
			)}
			{auth.type === "none" && <p className="auth-empty">This request does not use authorization.</p>}
		</section>
	);
}
