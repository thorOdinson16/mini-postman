import { useCallback, useEffect, useState } from "react";
import { environmentApi } from "./environment.api.js";

export function useEnvironments(workspaceId) {
	const [environments, setEnvironments] = useState([]);
	const [error, setError] = useState("");
	const load = useCallback(async (id) => {
		if (!id) {
			setEnvironments([]);
			setError("");
			return [];
		}
		try {
			setError("");
			const list = await environmentApi.list(id);
			setEnvironments(list);
			return list;
		} catch (loadError) {
			setError(loadError.message);
			setEnvironments([]);
			return [];
		}
	}, []);
	useEffect(() => {
		load(workspaceId);
	}, [workspaceId, load]);
	const activeEnvironment = environments.find((environment) => environment.isActive) || null;
	const activate = async (id) => {
		try {
			setError("");
			if (id) await environmentApi.update(id, { isActive: true });
			else if (activeEnvironment) await environmentApi.update(activeEnvironment._id, { isActive: false });
			await load(workspaceId);
		} catch (activateError) {
			setError(activateError.message);
		}
	};
	const create = async (values) => {
		await environmentApi.create({ workspaceId, ...values });
		await load(workspaceId);
	};
	const update = async (id, values) => {
		await environmentApi.update(id, values);
		await load(workspaceId);
	};
	const remove = async (id) => {
		await environmentApi.remove(id);
		await load(workspaceId);
	};
	return { environments, error, activeEnvironment, activate, create, update, remove };
}
