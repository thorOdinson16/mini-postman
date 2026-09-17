import { z } from "zod";
import { authService } from "./auth.service.js";

const loginSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(1).max(200) }).strict();

export async function login(request, response, next) {
	try {
		const { email, password } = loginSchema.parse(request.body);
		response.json({ data: await authService.login(email, password) });
	} catch (error) {
		next(error);
	}
}

export function session(request, response, next) {
	try {
		response.json({ data: authService.session(request.account) });
	} catch (error) {
		next(error);
	}
}

export function logout(request, response) {
	response.status(204).end();
}
