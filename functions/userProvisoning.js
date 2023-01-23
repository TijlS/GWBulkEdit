import path from "path";
import dayjs from "dayjs";
import fs from "fs/promises";
import chalk from "chalk";
import { cwd } from "process";
import crypto from "crypto";

import { admin_directory_v1 } from "googleapis";
import { getUsers } from "./getUsers.js";
import { getClassesWithUsers, getGroupsWithUsers, getSMSCUsers } from "./smartschoolHandler.js";
import {
	getLatestProvisioningFile,
	getSecondLatetsProvisioningFile,
} from "../helpers/provisioningFiles.js";

import ignoredUsers from "../config/ignored_users.json" assert { type: "json" };
import { getGoogleGroups, getGoogleGroupsWithUsers } from "./groupProvisioning.js";

/**
 *
 * @param {Array} data
 * @param {String} name
 */
const saveFile = async (data, name) => {
	let filename = `${name}@${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

	await fs
		.writeFile(
			path.join(cwd(), `provisioning/${filename}`),
			JSON.stringify(data),
			"utf-8"
		)
		.catch((err) => {
			return console.error(
				chalk.redBright("The API returned an error:", err.message)
			);
		})
		.then(() => {
			console.log(
				chalk.white.bgGreenBright(`Finished writing ${filename}`)
			);
		});
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
export const saveAllUsers = async (service) => {
	const smsc_users = await getSMSCUsers();
	const google_users = await getUsers({ customer: "my_customer" }, service);
	const classesWithUsers = await getClassesWithUsers();
	const groupsWithUsers = await getGroupsWithUsers()
	const googleGroups = await getGoogleGroups(service)

	await saveFile(
		smsc_users.map((user) => {
			return {
				username: user.gebruikersnaam,
				internalId: user.internnummer,
				name: {
					surname: user.voornaam,
					lastname: user.naam,
				},
				queryField: user.sorteerveld,
				status: user.status,
				leaver: user.schoolverlater,
				gorollen: user.gorollen,
			};
		}),
		"users_SMSC"
	);
	await saveFile(
		google_users.map((user) => {
			return {
				id: user.id,
				email: user.primaryEmail,
				name: {
					surname: user.name.givenName,
					lastname: user.name.familyName,
					fullname: user.name.fullName,
				},
				orgUnit: user.orgUnitPath,
			};
		}),
		"users_GOOGLE"
	);

	await saveFile(classesWithUsers, "classes_SMSC");
	await saveFile(groupsWithUsers, "groups_SMSC");
	await saveFile(googleGroups.map(g => {
		return {
			groupName: g.name,
            groupEmail: g.email,
		}
	}), "groups_GOOGLE")
};

/**
 *
 * @returns {Array}
 */
export const findNewUsers = async () => {
	const users = await getLatestProvisioningFile("combined_users");
	const lastUsers = await getSecondLatetsProvisioningFile("combined_users");

	if (lastUsers) {
		//Search in last provisioning file
		const lastUsersNames = lastUsers.content.map(
			(u) => u.smartschool.username
		);
		return users.content.filter(
			(user) =>
				!lastUsersNames.includes(user.smartschool.username) &&
				user.smartschool.status === "actief" &&
				user.google.length === 0 &&
				!ignoredUsers.username.includes(user.smartschool.username)
		);
	} else {
		//First time program has run
		return users.content.filter(
			(user) =>
				user.smartschool.status === "actief" &&
				user.google.length === 0 &&
				!ignoredUsers.username.includes(user.smartschool.username)
		);
	}
};

/**
 *
 * @returns {Array}
 */
export const findDeletedUsers = async () => {
	const users = await getLatestProvisioningFile("combined_users");
	const lastUsers = await getSecondLatetsProvisioningFile("combined_users");

	if (lastUsers) {
		//Search in last provisioning file
		const usersIds = users.content.map((u) => u.smartschool.internalId);
		return lastUsers.content.filter(
			(user) =>
				!usersIds.includes(user.smartschool.internalId) &&
				!ignoredUsers.username.includes(user.smartschool.username) &&
				user.google.length !== 0
		);
	} else {
		return false;
	}
};

/**
 *
 * @returns {Array}
 */
export const findUpdatedUsers = async () => {
	const users = await getLatestProvisioningFile("combined_users");
	const lastUsers = await getSecondLatetsProvisioningFile("combined_users");

	if (lastUsers) {
		const lastUsersIds = lastUsers.content.map(
			(u) => u.smartschool.internalId
		);
		//Search in last provisioning file
		return users.content.filter((user) => {
			const lastUserProfile = lastUsers.content.find(
				(u) => u.smartschool.internalId == user.smartschool.internalId
			);
			if(!lastUserProfile){
				//Prevent finding new users
				return false
			}
			const canBeChecked =
				lastUsersIds.includes(user.smartschool.internalId) &&
				user.smartschool.status === "actief" &&
				user.google.length !== 0 &&
				user.smartschool.internalId !== null &&
				!ignoredUsers.username.includes(user.smartschool.username);
			const isNew =
				user.smartschool.username !==
					lastUserProfile.smartschool.username ||
				user.smartschool.name.surname !==
					lastUserProfile.smartschool.name.surname ||
				user.smartschool.name.lastname !==
					lastUserProfile.smartschool.name.lastname ||
				(user.officialClass !== undefined
					? user.officialClass !== lastUserProfile.officialClass
					: false);

			return canBeChecked && isNew;
		});
	} else {
		return false;
	}
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 * @param {Object} user
 */
export const createNewUser = async (service, user) => {
	const password = crypto.randomBytes(16).toString("base64");
	const isStudent = user.smartschool.gorollen.length == 0 || user.officialClass;
	const email = `${user.smartschool.username}@${
		isStudent ? "leerling." : ""
	}go-ao.be`;

	await service.users.insert({
		requestBody: {
			primaryEmail: email,
			name: {
				givenName: `${user.smartschool.name.surname}`,
				familyName: `${user.smartschool.name.lastname}`,
			},
			password: `${password}`,
			changePasswordAtNextLogin: true,
			orgUnitPath: isStudent ? `/leerlingen${user.officialClass ? `/${user.officialClass}` : ''}` : "/personeel",
		},
	});

	console.table({
		primaryEmail: email,
		name: {
			givenName: `${user.smartschool.name.surname}`,
			familyName: `${user.smartschool.name.lastname}`,
		},
		password: `${password}`,
		changePasswordAtNextLogin: true,
		orgUnitPath: isStudent ? `/leerlingen${user.officialClass ? `/${user.officialClass}` : ''}` : "/personeel",
	})

	return {
		password,
		email,
	};
};
