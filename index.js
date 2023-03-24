import { admin_directory_v1, google } from "googleapis";
import {
	writeFileSync as fsWriteFileSync,
	readFileSync as fsReadFileSync,
} from "fs";
import path from "path";
import { cwd, exit } from "process";
import { OAuth2Client } from "google-auth-library";

import config from "./config/config.json" assert { type: "json" };
import { authorize } from "./functions/auth.js";

import {
	createNewUser,
	disableGoogleUsers,
	findDeletedUsers,
	findNewUsers,
	findUpdatedUsers,
	photoProvisioning,
	saveAllUsers,
} from "./functions/userProvisoning.js";
import { sendEmail, sendEmailWithAttachments } from "./functions/smartschoolHandler.js";
import {
	addUserToGroups,
	createNewGroups,
	deleteOldGroups,
} from "./functions/groupProvisioning.js";
import {
	cleanUpProvisioningFiles,
	combineUserProvisioningFiles,
	getLatestProvisioningFile,
	updateProvisioningFile,
} from "./helpers/provisioningFiles.js";
import {
	addStudentsToOU,
	createNewOrgUnits,
	deleteOldOrgUnits,
} from "./functions/orgUnitProvisioning.js";
import { addMailToQueue, readMailFromQueue } from "./functions/mailQueue.js";
import { configureLogger, latestLogFile } from "./helpers/configureLogger.js";
import winston from "winston";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js"

dayjs.extend(customParseFormat)

//Start the logger
configureLogger()
const logger = winston.loggers.get('logger')

authorize().then(startProgram);

const findParent = (id, currentNode) => {
	let i, currentChild, result;

	if (id === currentNode.id) {
		return currentNode;
	} else {
		for (i = 0; i < currentNode.children.length; i++) {
			currentChild = currentNode.children[i];

			result = findParent(id, currentChild);

			if (result !== false) {
				return result;
			}
		}

		return false;
	}
};

const base64_encode = (file) => {
	let bitmap = fsReadFileSync(path.join(cwd(), file), "base64");
	return bitmap;
};

/**
 *
 * @param {OAuth2Client} auth
 */
async function startProgram(auth) {
	//Create Google Admin Service
	const service = google.admin({
		version: "directory_v1",
		auth,
		timeout: 5000,
	});

	try {
		//Domain prefetching
		const domains = (
			await service.domains.list({
				customer: "my_customer",
			})
		).data.domains;
		config.owned_domains = domains.map((domain) => {
			return domain.domainName;
		});
		logger.info('Succefully fetched domains')
	} catch (error) {
		logger.error('Failed to fetch domains, aborting...')
		exit()
	}

	try {
		//OrgUnit prefetching
		const orgUnits = (
			await service.orgunits.list({
				customerId: "my_customer",
				orgUnitPath: "/",
				type: "all",
			})
		).data.organizationUnits;
		const orgUnitsFormatted = {
			id: "0",
			orgUnitPath: "/",
			children: [],
		};
	
		orgUnits
			.sort((a, b) => a.parentOrgUnitPath.localeCompare(b.parentOrgUnitPath))
			.forEach((unit) => {
				if (unit.parentOrgUnitPath !== "/") {
					const parent = findParent(
						unit.parentOrgUnitId,
						orgUnitsFormatted
					);
					parent.children.push({
						id: unit.orgUnitId,
						name: unit.name,
						orgUnitPath: unit.orgUnitPath,
						parentOrgUnitPath: unit.parentOrgUnitPath,
						parentOrgUnitId: unit.parentOrgUnitId,
						children: [],
					});
				} else {
					orgUnitsFormatted.children.push({
						id: unit.orgUnitId,
						name: unit.name,
						orgUnitPath: unit.orgUnitPath,
						children: [],
					});
				}
			});
	
		config.orgUnits = orgUnitsFormatted;

		logger.info('Succefully fetched orgUnits')
	} catch (error) {
		logger.error('Failed to fetch orgUnits, aborting...')
		exit()
	}

	fsWriteFileSync(
		path.join(cwd(), "config/config.json"),
		JSON.stringify(config, null, 4)
	);

	return startProvisioning(service);
}

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
async function startProvisioning(service) {
	console.time("program_time");

	/*****************************************************************************************
	 * DEV:									TEMPORARY									DEV: *
	 *****************************************************************************************
	 */
	// const groups = (await getLatestProvisioningFile('google_groups_and_users')).content
	// for (const group of groups) {
	// 	if(group.groupEmail.includes('@leerling'))
	// 	console.log(group.groupEmail)
	// }
	// await service.groups.update({
	// 	groupKey: "vwg-informatica@go-ao.be",
	// 	requestBody: {
	// 		name: "VWG-Informatica"
	// 	}
	// })
	// await createNewGroups(service);
	// return
	/*****************************************************************************************
	 * DEV:								END_TEMPORARY_END								DEV: *
	 *****************************************************************************************
	 */

	await cleanUpProvisioningFiles();
	logger.info('Removed old provisioning files.')

	// 1. Fetch all users from SMSC and Google
	logger.info('Fetching all users')
	await saveAllUsers(service);

	//2. Combine the user files to one
	logger.info('Combing user files')
	await combineUserProvisioningFiles();

	logger.info('Reading mailqueue')
	//Send queued mails
	await readMailFromQueue();

	logger.info('Disabling non-active SMSC users')
	await disableGoogleUsers(service);

	//3. Check orgUnits based on official classes
	//   OU fetched wile starting program, stored in config
	//   Only edit '/leerlingen/*'
	logger.info('Creating new OU\'s in Google')
	await createNewOrgUnits(service);

	//4. Add users to their respective (official) class ou's
	logger.info('Adding users to OU\'s')
	await addStudentsToOU(service);

	//5. Remove non-exsitent classes existing as ou
	logger.info('Deleting old OU\'s')
	await deleteOldOrgUnits(service);

	//6. Check for new SMSC users and create google
	logger.info('Searching for new users')
	const newUsers = await findNewUsers();
	logger.info(`Creating ${newUsers.length} new users`)
	if (newUsers.length > 0) {
		const users_file = await getLatestProvisioningFile("combined_users");
		for (const user of newUsers) {
			if (!config.is_test) {
				//TODO: Fix needded (?)
				const userObj = users_file.content.find(
					(u) =>
						((
							u.smartschool.internalId ==
							user.smartschool.internalId &&
							u.smartschool.internalId !== null) ||
						u.username == user.username) &&
						u.smartschool.leaver !== 1
				);
				const { google_cred, newUser } = await createNewUser(
					service,
					user
				);

				//4.2 Send message with password and email to their SMSC
				const title = `Google Workspace account`;
				const body = `<div style="font-size: 14px; line-height: 115%">

					<img src="data:image/png;base64,${base64_encode(
						"images/google_workspace_account_ready.png"
					)}" style="width: 100%; margin-bottom: 5px;">
					</br>
					<p>Beste ${user.smartschool.name.surname}</p>
					<p>Uw Google Workspace account is klaar voor gebruik!</p>
					<p>Aanmelden kan met onderstaande gegevens via <a target="_blank" href="https://workspace.google.com/dashboard">https://workspace.google.com/dashboard</a>.</p>
					<div style="border-left: 1.5px solid #ccc; padding-left: 5px;">
						<p><b>Email</b>: <i>${google_cred.email}</i></p>
						<p><b>Wachtwoord</b>: <i>${google_cred.password}</i></p>
					</div>
					<p>U zal uw wachtwoord onmiddellijk moeten wijzigen nadat u voor de eerste keer hebt ingelogd.</p>
					</br>
					<p>Met vriendelijke groeten</p>
					<p>ICT Dienst</p>
					<p>GO! atheneum Oudenaarde</p>
					<img src="data:image/png;base64,${base64_encode(
						"images/go_ao.png"
					)}" width="265" height="81">
				</div>`;
				if (user.smartschool.internalId) {
					await sendEmail(title, body, user.smartschool.internalId);
				} else {
					logger.warn(`Can't send email to ${user.smartschool.username}, missing internalId`)
					await addMailToQueue(
						title,
						body,
						user.smartschool.username
					);
				}
				await sendEmail(
					title + ": KOPIE",
					(user.smartschool.internalId
						? ""
						: '<span style="font-size: 18px;background-color: #e74c3c;color: white;width: 95%;display: block;padding: 1em;text-align: center;border-radius: 7.5px;margin: .5em auto;">&ensp; MESSAGE NOT DELIVERED: NO ID FOUND &ensp;</span>') +
						body +
						`<p>Verzonden naar: ${user.smartschool.username}</p>`,
					"25045"
				);

				userObj.google[0] = {
					id: newUser.data.id,
					email: newUser.data.primaryEmail,
					name: {
						surname: newUser.data.name.givenName,
						lastname: newUser.data.name.familyName,
						fullname: newUser.data.name.fullName,
					},
					orgUnit: newUser.data.orgUnitPath,
					suspended: newUser.data.suspended,
				};
			} else {
				logger.info(`Creating new users skipped.`);
			}
		}
		//TODO: ERR BIJ OPSLAAN
		await updateProvisioningFile(users_file.file, users_file.content);
	} else {
		logger.info("no new users found");
	}

	// await photoProvisioning(service)
	logger.info('Creating new Google Groups')
	await createNewGroups(service);

	logger.info('Adding users to Google Groups')
	await addUserToGroups(service);

	logger.info('Deleting old Google Groups')
	await deleteOldGroups(service);

	//7. Check for deleted users and delete their account
	logger.info('Searching for deleted users')
	const deletedUsers = await findDeletedUsers();
	logger.info(`Deleting ${deletedUsers.length} new users`)
	if (deletedUsers && deletedUsers.length > 0) {
		if (!config.is_test) {
			for (const user of deletedUsers) {
				await service.users.delete({
					userKey: user.google[0].id,
				});
			}
		} else {
			logger.info("Deleting user skipped.");
		}
	} else {
		logger.info("no deleted users found");
	}

	//8. Check for updated users and provision the data to google
	logger.info('Searching for updated users')
	const updatedUsers = await findUpdatedUsers();
	logger.info(`Updating ${updatedUsers.length} new users`)
	if (updatedUsers && updatedUsers.length > 0) {
		if (!config.is_test) {
			for (const user of updatedUsers) {
				const newEmail = `${user.smartschool.name.surname}.${
					user.smartschool.name.lastname
				}@${user.google.email.split("@")[1]}`;
				await service.users.update({
					userKey: user.google.id,
					requestBody: {
						name: {
							givenName: user.smartschool.name.surname,
							familyName: user.smartschool.name.lastname,
						},
						primaryEmail: newEmail,
					},
				});

				const title = `Google Workspace account: wijziging`;
				const body = `<div style="font-size: 14px; line-height: 115%">
					<img src="data:image/png;base64,${base64_encode(
						"images/google_workspace_account_ready.png"
					)}" style="width: 100%; margin-bottom: 5px;">
					</br>
					<p>Beste ${user.smartschool.name.surname}</p>
					<p>We laten u weten dat uw Google Workspace account is aangepast naar de laatste gegevens.</p>
					<p>Aanmelden kan met onderstaande gegevens via <a target="_blank" href="https://workspace.google.com/dashboard">https://workspace.google.com/dashboard</a>.</p>
					<div style="border-left: 1.5px solid #ccc; padding-left: 5px;">
						<p><b>Email</b>: <i>${newEmail}</i>
					</div>
					<p>Uw wachtwoord bleef ongewijzigd.</p>
					</br>
					<p>Met vriendelijke groeten</p>
					<p>ICT Dienst</p>
					<p>GO! atheneum Oudenaarde</p>
					<img src="data:image/png;base64,${base64_encode(
						"images/go_ao.png"
					)}" width="265" height="81">
				</div>`;
				if (user.smartschool.internalId) {
					await sendEmail(title, body, user.smartschool.internalId);
				} else {
					logger.warn(`Can't send email to ${user.smartschool.username}, missing internalId`)
					await addMailToQueue(
						title,
						body,
						user.smartschool.username
					);
				}
			}
		}
	} else {
		logger.info("no updated users found");
	}

	//9. Send current log file
	const logFile = await latestLogFile()
	// const to = ["25045", "17302010339"]
	const to = ["25045"]
	for (const rec of to) {
		await sendEmailWithAttachments(
			`GWBE log: ${dayjs().format("DD-MM-YYYY_HH-mm")}`, `
				<h1 style="margin-bottom: 5px;">GWBE log</h1>
				<div style="padding-left: 5px; border-left: 2px solid #ccc;">
					<p><b>Datum: </b> ${dayjs().format("DD-MM-YYYY_HH-mm")}</p>
				</div>
			`,
			rec,
			'Null',
			[logFile]
		)
	}

	console.timeEnd("program_time");
}
