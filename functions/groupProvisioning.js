import { admin_directory_v1 } from "googleapis";
import chalk from "chalk";
import { getLatestProvisioningFile } from "../helpers/provisioningFiles.js";
import ignored_groups from "../config/ignored_groups.json" assert { type: "json" };

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getGoogleGroups = async (service) => {
	let res = [];
	const requestPages = async (options) => {
		try {
			const pageRes = await service.groups.list(options);
			res = [...res, ...pageRes.data.groups];
			if (pageRes.data.nextPageToken) {
				options.pageToken = pageRes.data.nextPageToken;
				options.customer = "my_customer";
				await requestPages(options);
			}
		} catch (err) {
			console.error(chalk.redBright(`An error occured: ${err}`));
			process.exit(0);
		}
	};

	await requestPages({
		customer: "my_customer",
	});

	return res;
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getUsersInGroup = async (service, groupKey) => {
	let res = [];
	const requestPages = async (options) => {
		try {
			const pageRes = await service.members.list(options);
			if (pageRes.data.members) {
				res = [...res, ...pageRes.data.members];
				if (pageRes.data.nextPageToken) {
					options.pageToken = pageRes.data.nextPageToken;
					options.groupKey = groupKey;
					await requestPages(options);
				}
			}
		} catch (err) {
			console.error(chalk.redBright(`An error occured: ${err}`));
			process.exit(0);
		}
	};

	await requestPages({
		groupKey: groupKey,
	});

	return res;
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getGoogleGroupsWithUsers = async (service) => {
	let res = [];

	console.time("fetch_groups_google");
	console.log(`${chalk.italic.gray("Fetching google groups with users...")}`);

	const groups = await getGoogleGroups(service);

	for (const g of groups) {
		const users = await getUsersInGroup(service, g.id);
		res.push({
			groupName: g.name,
			groupEmail: g.email,
			users: users.map((u) => {
				return {
					id: u.id,
					email: u.email,
				};
			}),
		});
	}

	console.log(`${chalk.italic.gray("Done!")}`);
	console.timeEnd("fetch_groups_google");

	return res;
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const deleteOldGroups = async (service) => {
	console.time("groups_delete");
	const groups_smsc = await getLatestProvisioningFile("smsc_groups");
	const groups_google = await getLatestProvisioningFile("google_groups_and_users");

	const groupNames = groups_smsc.content.map((g) => g.groupCode?.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, ""));

	const old_groups = groups_google.content.filter(
		(g) =>
			g.groupEmail.includes("leerling.go-ao.be") &&
			!groupNames.includes(g.groupName) &&
			g.groupName !== "Leerlingen" &&
			g.groupName !== "LK-Fortstraat" &&
			g.groupName !== "9TEST-Klas"
	);


	for (const group of old_groups) {
		const users = await service.members.list({
			groupKey: group.groupEmail,
		});
		if (users.data.members) {
			for (const user of users.data.members) {
				await service.members.delete({
					groupKey: group.groupEmail,
					memberKey: user.id,
				});
			}
		}

		await service.groups.delete({
			groupKey: group.groupEmail,
		});
		console.log(
			`${chalk.bgRedBright.white("DELETED")} ${group.groupEmail}`
		);
	}
	console.timeEnd("groups_delete");
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const createNewGroups = async (service) => {
	const groups = await getLatestProvisioningFile("google_groups_and_users");
	const groups_smsc = await getLatestProvisioningFile("smsc_groups");

	const googleNames = groups.content
		.filter((g) =>
			g.groupEmail.includes("leerling.go-ao.be") ||
			g.groupEmail.includes("vwg-")
		)
		.map((g) => g.groupName);

	const new_groups = groups_smsc.content
		.filter(
			(g) =>
				g.users.length > 0 &&
				!g.children &&
				!ignored_groups.groupCodes.includes(g.groupCode) &&
				!g.groupCode.includes(ignored_groups.groupCodesIncludes)
		)
		.map((g) => ({
			...g,
			groupCode: g.groupCode.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, "").replace(/\//g, "_"),
		}))
		.filter((g) => !googleNames.includes(g.groupCode));


	console.table(new_groups)
	

	// for (const group of new_groups) {
	// 	const email = `${group.groupCode}@${group.groupName.includes('VWG') ? '' : 'leerling.'}go-ao.be`

	// 	const newGroup = await service.groups.insert({
	// 		requestBody: {
	// 			email: email,
	// 			description: `${group.groupName}`,
	// 		},
	// 	});
	// 	console.log(
	// 		`${chalk.bgGreenBright.white("CREATED")} ${newGroup.data.email}`
	// 	);
	// }
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const addUserToGroups = async (service) => {
	const users = (await getLatestProvisioningFile("combined_users")).content;
	const groups_google = (await getLatestProvisioningFile("google_groups_and_users"))
		.content;

	for (const user of users) {
		if(user.smartschool.actief !== "actief") {
			return;
		}

		//Filter non-existing google groups out of SMSC groups
		const smsc_groups = user.groups
			.filter((g) => groups_google.some((gg) => gg.groupName == g.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, "").replace(/\//g, "_")))
			.map((g) => ({
				name: g,
				groupEmail: groups_google.find((gg) => gg.groupName == g.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, "").replace(/\//g, "_"))
					.groupEmail,
			}));
		
		if(user.isStudent){
			//Fake student-group
			smsc_groups.push({
				name: 'Leerlingen',
				groupEmail: 'leerlingen@leerling.go-ao.be'
			})
		}
		
		//Get google groups where user is no longer part of
		const old_google_groups = user.google_groups.filter(
			(g) =>
				!user.groups.some((gg) => gg.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, "").replace(/\//g, "_") == g.groupName) &&
				g.groupName !== "personeel" &&
				g.groupName !== "administratie" &&
				g.groupName !== "bewaking" &&
				g.groupName !== "Directie" &&
				g.groupName !== "Noteble" &&
				g.groupName !== "Leerlingbegeleding" &&
				g.groupName !== "Opvoeders Fortstraat" &&
				g.groupName !== "CLW-Leerkrachten" &&
				g.groupName !== "Classroom-docenten" &&
				g.groupName !== "LK-1graad" &&
				g.groupName !== "Opvoeders-Bergstraat" &&
				g.groupName !== "testgroep" &&
				g.groupName !== "CLW-Trajectbegeleiding" &&
				g.groupName !== "Financiële administratie" &&
				g.groupName !== "ICT" &&
				g.groupName !== "team eetfestijn" &&
				!g.groupName.includes("VWG-") &&
				!g.groupName.includes("Media")
		);

		for (const group of old_google_groups) {
			await service.members.delete({
				groupKey: group.groupEmail,
				memberKey: user.google[0].id
			})
			console.log(`deleted ${user.name} from ${group.groupEmail}`)
		}


		for (const group of smsc_groups) {
			if (
				!user.google_groups?.find(g => g.groupName == group.name.replace(/ /g, "").replace(/\)/g, "_").replace(/\./g, "").replace(/\//g, "_"))
			) {
				try {
					await service.members.insert({
						groupKey: group.groupEmail,
						requestBody: {
							id: user.google[0]?.id,
						},
					});
					console.log(`added ${user.name} to ${group.groupEmail}`);
				} catch (error) {
					console.log(`${chalk.bgRedBright.white('ERROR:')} no google for ${user.name}`)
				}
			}

		}
	}
};
