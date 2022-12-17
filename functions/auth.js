import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import path from "path";
import { cwd } from "process";

const SCOPES = [
	"https://www.googleapis.com/auth/admin.directory.user",
	"https://www.googleapis.com/auth/admin.directory.user.alias",
	"https://www.googleapis.com/auth/admin.directory.group",
	"https://www.googleapis.com/auth/admin.directory.group.member",
	"https://www.googleapis.com/auth/admin.directory.orgunit",
	"https://www.googleapis.com/auth/admin.directory.userschema",
	"https://www.googleapis.com/auth/admin.directory.domain.readonly"
];
const TOKEN_PATH = path.join(cwd(), "config/token.json");
const CREDENTIALS_PATH = path.join(cwd(), "config/credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
const loadSavedCredentialsFirst = async () => {
	try{
		const content = await fs.readFile(TOKEN_PATH)
		const credentials = JSON.parse(content)
		return google.auth.fromJSON(credentials)
	} catch (err){
		return null
	}
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
const saveCredentials = async (client) => {
	const content = await fs.readFile(CREDENTIALS_PATH)
	const keys = JSON.parse(content)
	const key = keys.installed || keys.web
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token
	})
	await fs.writeFile(TOKEN_PATH, payload)
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export const authorize = async () => {
	let client = await loadSavedCredentialsFirst()
	if(client){
		return client;
	}
	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH
	})
	if(client.credentials){
		await saveCredentials(client)
	}
	return client
}