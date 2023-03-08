import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import fs from "fs";
import { admin_directory_v1 } from "googleapis";
import path from "path";
import { cwd } from "process";

import custom_mappings from "../config/custom_mapping.json" assert { type: "json" };

dayjs.extend(customParseFormat);

/**
 * @typedef {Object} ProvisioningFile
 * @property {String} file
 * @property {Array} content
 */

const FILE_NAME_GROUPS = {
	smsc_users: ["users_SMSC"],
	smsc_classes: ["classes_SMSC"],
	smsc_groups: ["groups_SMSC"],
	google_users: ["users_GOOGLE"],
	google_groups: ["groups_GOOGLE"],
	google_groups_and_users: ['groups_GOOGLE_with_users'],
	combined_users: ["combined_users"],
	test: ["test_users"],
};

export const getProvisioningFiles = async (filter) => {
	let files = await fs.readdirSync(path.join(cwd(), "provisioning/"));
	files = files.map((file) => {
		const fileNameSplit = file.split("@");
		const timeCreated = dayjs(fileNameSplit[1], "DD-MM-YYYY_HH-mm");
		return {
			name: fileNameSplit[0],
			createdAt: timeCreated.unix(),
			originalFileName: file,
		};
	});

	if (filter) {
		files = files.filter((file) =>
			FILE_NAME_GROUPS[filter]?.includes(file.name)
		);
	}

	return files.sort((a, b) => a.createdAt - b.createdAt);
};

export const cleanUpProvisioningFiles = async () => {
	for (const filter in FILE_NAME_GROUPS) {
		const files = await getProvisioningFiles(filter)

		for (const file of files.slice(0, -3)){
			await fs.rmSync(path.join(cwd(), `provisioning/${file.originalFileName}`), {
				force: true,
			})
			console.log(`removed ${file.originalFileName}`)
		}
	}
} 

/**
 * 
 * @param {String} dataType 
 * @returns {ProvisioningFile}
 */
export const getLatestProvisioningFile = async (dataType) => {
	const files = await getProvisioningFiles(dataType);
	const latestFile = files[files.length - 1].originalFileName;

	const fileContents = fs.readFileSync(
		path.join(cwd(), `provisioning/${latestFile}`),
		"utf-8"
	);

	return {
		file: latestFile,
		content: JSON.parse(fileContents),
	};
};

/**
 * 
 * @param {String} dataType 
 * @returns {ProvisioningFile}
 */
export const getSecondLatetsProvisioningFile = async (dataType) => {
	const files = await getProvisioningFiles(dataType);
	const latestFile = files[files.length - 2].originalFileName;

	try {
		const fileContents = fs.readFileSync(
			path.join(cwd(), `provisioning/${latestFile}`),
			"utf-8"
		);

		return {
			file: latestFile,
			content: JSON.parse(fileContents),
		};
	} catch (e) {
		return null;
	}
};

export const updateProvisioningFile = async (fileName, content) => {
	fs.writeFileSync(
		path.join(cwd(), `provisioning/${fileName}`),
		JSON.stringify(content, null, 4)
	);
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
export const combineUserProvisioningFiles = async () => {
	let output = [];

	const google_users = (
		await getLatestProvisioningFile("google_users")
	).content;
	const smsc_users = (
		await getLatestProvisioningFile("smsc_users")
	).content;
	const smsc_groups_with_users = (
		await getLatestProvisioningFile("smsc_groups")
	).content
	const google_groups_with_users = (
		await getLatestProvisioningFile("google_groups_and_users")
	).content

	for (const user of smsc_users) {
		const queryFieldFormatted = `${user.queryField
			.split("-")
			.reverse()
			.join(".")
			.toLowerCase()}}`;
		const generatedUsername = `${user.name.surname
			.split(" ")
			.join(".")
			.toLowerCase()
			.replace(/-/g, "")
			.toLowerCase()}.${user.name.lastname
			.split(" ")
			.join(".")
			.toLowerCase()
			.replace(/-/g, "")
			.toLowerCase()}`;
		const customFormat = custom_mappings.find(
			(m) => m.smsc == user.username && !m.ignore
		);
		const google_user = google_users.filter(
			(u) =>
				(u.email.split("@")[0].toLowerCase() ==
					user.username
						.toLowerCase()
						.normalize("NFD")
						.replace(/\p{Diacritic}/gu, "") ||
				u.email.split("@")[0].toLowerCase() == queryFieldFormatted ||
				u.email.split("@")[0].toLowerCase() == generatedUsername ||
				u.email.split("@")[0].toLowerCase() == customFormat?.google) &&
				(
					user.gorollen.length > 0 && user.username !== "llnraad.fortstraat"
						? !u.orgUnit.includes("/leerlingen") 
						: u.orgUnit.includes("/leerlingen")
				)
		);
		const officialClass = smsc_groups_with_users.filter(g => g.official === true).find((c) =>
			c.users.some((u) => 
				( u.internalId === user.internalId && user.internalId !== null ) ||
				u.username === user.username
			)
		);
		const groups = smsc_groups_with_users.filter(g => 
			g.users.some(u => u.internalId === user.internalId && user.internalId !== null)	
		)
		const google_groups = google_groups_with_users.filter(g => 
			g.users.some(u => u.id === google_user[0]?.id)
		).map(g => ({
			groupName: g.groupName,
			groupEmail: g.groupEmail
		}))

		output.push({
			name: user.username,
			officialClass: officialClass?.groupCode,
			smartschool: user,
			google: google_user,
			groups: groups.map(g => g.groupCode),
			google_groups: google_groups,
			custom: {
				photo_updated: false,
				class_updated: false,
			},
		});
	}

	let filename = `combined_users@${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

	fs.writeFileSync(
		path.join(cwd(), `provisioning/${filename}`),
		JSON.stringify(output, null, 4)
	);
};
