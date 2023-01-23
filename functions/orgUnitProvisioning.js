import { admin_directory_v1 } from "googleapis";
import config from "../config/config.json" assert { type: "json" };
import { getLatestProvisioningFile } from "../helpers/provisioningFiles.js";
import { getUsers } from "./getUsers.js";

const sleep = (time) => {
	return new Promise((resolve) => setTimeout(resolve, time));
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
export const deleteOldOrgUnits = async (service) => {
	const studentOUs = config.orgUnits.children.find(
		(ou) => ou.orgUnitPath == "/leerlingen"
	);
	const smscClasses = await getLatestProvisioningFile("smsc_classes");

	//Search for old ou in google => remove
	for (const ou of studentOUs.children) {
		const smsc_class = smscClasses.content.find(
			(c) => c.classCode == ou.name
		);
		if (!smsc_class && !config.is_test) {
			await service.orgunits.delete({
				customerId: "my_customer",
				orgUnitPath: ou.orgUnitPath
					.replace("/", "")
					.replace("+", "%2B"),
			});
			console.log(`removed ${ou.orgUnitPath}`);
		}
	}
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
const createOU = async (service, body) => {
	await service.orgunits.insert({
		customerId: "my_customer",
		requestBody: body,
	});
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
export const createNewOrgUnits = async (service) => {
	const studentOUs = config.orgUnits.children.find(
		(ou) => ou.orgUnitPath == "/leerlingen"
	);
	const smscClasses = await getLatestProvisioningFile("smsc_classes");

	//Search for non-existing class in google => add ou
	for (const smsc_class of smscClasses.content) {
		const ou = studentOUs.children.find(
			(ou) => ou.name == smsc_class.classCode
		);
		if (!ou) {
			const formattedName = smsc_class.classCode;
			await createOU(service, {
				name: formattedName,
				description: formattedName,
				parentOrgUnitPath: "/leerlingen",
				blockInheritance: false,
			});
			// await sleep(2000);
			console.log("Created OU /leerlingen/" + formattedName);
		}
	}
};

/**
 *
 * @param {admin_directory_v1.Admin} service
 */
export const addStudentsToOU = async (service) => {
	const users = await getLatestProvisioningFile("combined_users");
	const usersWithClass = users.content.filter(
		(u) =>
			u.officialClass &&
			u.smartschool.leaver === 0 &&
			u.smartschool.status == "actief" &&
			u.google.length > 0
	);

	for (const user of usersWithClass) {
		for (const google of user.google) {
			await service.users.update({
				userKey: google.id,
				requestBody: {
					orgUnitPath: `/leerlingen/${user.officialClass}`,
				},
			});
            console.log(`${google.email} moved to /leerlingen/${user.officialClass}`)
		}
	}
};
