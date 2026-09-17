import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getConfig } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { authRepository } from "./auth.repository.js";

const publicAccount = (account) => ({ _id: String(account._id), name: account.name, email: account.email });

const sign = (account) =>
	jwt.sign({ sub: String(account._id), type: "workspace" }, getConfig().jwtSecret, {
		expiresIn: getConfig().jwtExpiresIn,
		issuer: "postman-api",
		audience: "postman-app",
	});

export const authService = {
	async login(email, password) {
		const account = await authRepository.findActiveByEmailWithPassword(email.toLowerCase());
		const valid = account ? await bcrypt.compare(password, account.passwordHash) : false;
		if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
		return { account: publicAccount(account), token: sign(account) };
	},
	async authenticate(token) {
		let payload;
		try {
			payload = jwt.verify(token, getConfig().jwtSecret, { issuer: "postman-api", audience: "postman-app" });
		} catch {
			throw new AppError(401, "INVALID_TOKEN", "Your Postman session is invalid or has expired.");
		}
		if (payload.type !== "workspace" || !mongoose.isValidObjectId(payload.sub)) {
			throw new AppError(401, "INVALID_TOKEN", "Your Postman session is invalid or has expired.");
		}
		const account = await authRepository.findActiveById(payload.sub);
		if (!account) throw new AppError(401, "ACCOUNT_UNAVAILABLE", "This Postman account is no longer available.");
		return { account, payload };
	},
	session(account) {
		return { account: publicAccount(account) };
	},
};
