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
	const groups_smsc = await getLatestProvisioningFile("smsc_groups");
	const groups_google = await getLatestProvisioningFile("google_groups");

	const groupNames = groups_smsc.content.map((g) => g.groupName);

	const old_groups = groups_google.content.filter(
		(g) =>
			g.groupEmail.includes("leerling.go-atheneumoudenaarde.be") &&
			!groupNames.includes(g.groupName)
	);

	console.time("groups_delete");
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
	const groups = await getLatestProvisioningFile("google_groups");
	const groups_smsc = await getLatestProvisioningFile("smsc_groups");

	const googleNames = groups.content
		.filter((g) =>
			g.groupEmail.includes("leerling.go-atheneumoudenaarde.be")
		)
		.map((g) => g.groupName.toLowerCase());

	const new_groups = groups_smsc.content.filter(
		(g) =>
			!googleNames.includes(g.groupName.toLowerCase()) &&
			g.users.length > 0 &&
			!g.children &&
			!ignored_groups.groupCodes.includes(g.groupCode) &&
			!g.groupCode.includes(ignored_groups.groupCodesIncludes) &&
			g.groupName == g.groupCode
	);

	for (const group of new_groups) {
		const newGroup = await service.groups.insert({
			requestBody: {
				email: `${group.groupCode
					.replace(/ /g, "")
					.replace(/\)/g, "_")}@leerling.go-atheneumoudenaarde.be`,
				description: `${group.groupName}`,
			},
		});
		// await service.groups.aliases.insert({
		//     groupKey: `${newGroup.data.id}`,
		//     requestBody: {
		//         alias: `${encodeURIComponent(group.groupName)}@leerling.go-atheneumoudenaarde.be`
		//     }
		// })
		console.log(
			`${chalk.bgGreenBright.white("CREATED")} ${
				newGroup.data.email
			}`
		);
	}
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const studentGroupProvisioning = async (service) => {
	const groupsWithUsers = await getGroupsWithUsers(service);

	console.log(chalk.bgGreenBright("Finished!"));
	process.exit(0);
};
