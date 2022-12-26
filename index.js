import inquirer from "inquirer";
import chalk from "chalk";
import { admin_directory_v1, google } from "googleapis";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { writeFileSync as fsWriteFileSync } from "fs";
import path from "path";
import { cwd } from "process";
import { OAuth2Client } from "google-auth-library";

import { authorize } from "./functions/auth.js";
import updateUsersPrimaryEmail from "./functions/updateUsersPrimaryEmail.js";
import saveUsersToLocalFile from "./functions/saveUsersToLocalDB.js";
import clearlocalFiles from "./functions/clearLocalFiles.js";
import removeGroups from "./functions/removeGroups.js";

import config from "./config/config.json" assert { type: "json" };
import { domainChooser, orgChooser } from "./helpers/domain_org_chooser.js";
import { groupProvisioning } from "./functions/groupProvisioning.js";
import { photoProvisioning } from "./functions/photoProvisioning.js";
import { saveAllUsers } from "./functions/userProvisoning.js";
import { combineUserProvisioningFiles } from "./helpers/provisioningFiles.js";

const whatQuestion = [
	{
		type: "list",
		message: "What do you want to do?",
		choices: [
			new inquirer.Separator("USERS"),
			{
				name: "Change users primary email",
				value: "change_primary_email",
			},
			{
				name: "Save users to local database",
				value: "save_to_db",
			},
			new inquirer.Separator("Provisioning"),
			{
				name: "Save all users for provisioning",
				value: "save_all_users",
			},
			{
				name: "Combine latest user provisioning files",
				value: 'combine_newest_users'
			},
			{
				name: "Manage organization groups",
				value: "manage_groups",
			},
			{
				name: "Provision user profile pictures",
				value: "provision_profile_pictures",
			},
			{
				name: "Remove all users from groups",
				value: "empty_groups",
			},
			new inquirer.Separator("SMARTSCHOOL"),
			{
				name: "Availible soon",
				disabled: true
			},
			new inquirer.Separator("CONFIG"),
			{
				name: "Clear all files in generated directory",
				value: "clear_generated",
			},
		],
		name: "what",
	},
];
const queryTypeQuestion = [
	{
		type: "list",
		message: "From with property do you want to fetch the users?",
		choices: ["domain", "organization unit"],
		name: "queryType",
		filter(val) {
			switch (val) {
				case "domain":
					return 1;
				case "organization unit":
					return 2;
				default:
					return 1;
			}
		},
	},
];

const FLAGS = yargs(hideBin(process.argv))
	.option("dev", {
		description: "Skip the part of creating/updating things",
		type: "boolean",
	})
	.option("signout", {
		description: "Sign all updated users out after updating them",
		type: "boolean",
	})
	.parse();

authorize().then(startProgram);

/**
 *
 * @param {OAuth2Client} auth
 */
async function startProgram(auth) {
	//Clear console
	console.clear()

	//Create Google Admin Service
	const service = google.admin({
		version: "directory_v1",
		auth,
		timeout: 1000,
	});

	if (config.is_first_time) {
		console.log(`
${chalk.bgGreenBright("=== Welcome to GWBulkEdit ===")}
Before we start, some configuration has to be done.
		`);
		const config_options_answers = await inquirer.prompt({
			type: "checkbox",
			choices: [
				{
					name: "Enable SMSC integration",
					value: "enable_smsc",
				},
				{
					name: "Prefetch domains on launch",
					value: "enable_domain_prefetch",
				},
			],
			name: "configOptions",
		});
		for (const configOption of config_options_answers.configOptions) {
			switch (configOption) {
				case "enable_smsc":
					config.smsc_enabled = true;

					console.log(`
${chalk.yellow("=== SMSC configuration ===")}
For using Smartschool, some extra configuration is needed.
1. Activate the Smartschool API under
	${chalk.italic("Algemene instellingen > Webservices")}
	Preferably create a custom profile there
2. Edit ${chalk.italic(
						"config/smartschool.json"
					)} and fill in the required fields.
			`);
					const smsc_config_answers = await inquirer.prompt({
						type: "confirm",
						message: "Edited config/smartschool.json?",
						name: "pass",
					});
					if (smsc_config_answers.pass !== true) {
						console.log(`
${chalk.redBright("Configuration failed")}
Try again!
				`);
						return process.exit(1);
					}
					break;

				case "enable_domain_prefetch":
					config.domain_prefetch_enabled = true;
					console.log(`
${chalk.yellow("=== Prefetching domains ===")}
					`);
					const domains = (
						await service.domains.list({
							customer: "my_customer",
						})
					).data.domains;
					config.owned_domains = domains.map((domain) => {
						return domain.domainName;
					});
					console.log(`
${chalk.greenBright("Done!")}
					`);
					break;
			}
		}
		console.log(`
${chalk.greenBright("Configuration succeeded!")}
The application will stop now, please restart it.
		`);

		config.is_first_time = false;

		//Rewrite config file
		fsWriteFileSync(
			path.join(cwd(), "config/config.json"),
			JSON.stringify(config, null, 4)
		);

		return process.exit(0);
	}

	//Domain prefetching
	if (config.domain_prefetch_enabled) {
		const domains = (
			await service.domains.list({
				customer: "my_customer",
			})
		).data.domains;
		config.owned_domains = domains.map((domain) => {
			return domain.domainName;
		});
		fsWriteFileSync(
			path.join(cwd(), "config/config.json"),
			JSON.stringify(config, null, 4)
		);
	}

	return aksQuestions(service);
}

/**
 * Start the inquirer process
 *
 * @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
async function aksQuestions(service) {
	const what_question_answers = await inquirer.prompt(whatQuestion);
	if (what_question_answers.what === "change_primary_email") {
		const query_type_answers = await inquirer.prompt(queryTypeQuestion);
		if (query_type_answers.queryType == 1) {
			const domain = await domainChooser();
			updateUsersPrimaryEmail(domain, null, service, 1, FLAGS);
		} else if (query_type_answers.queryType == 2) {
			const domain = await domainChooser();
			const orgPath = await orgChooser();
			updateUsersPrimaryEmail(domain, orgPath, service, 2, FLAGS);
		}
	} else if (what_question_answers.what === "manage_groups") {
		groupProvisioning(service)
	} else if (what_question_answers.what === "save_to_db") {
		saveUsersToLocalFile(service, FLAGS);
	} else if (what_question_answers.what === "clear_generated") {
		clearlocalFiles();
	} else if (what_question_answers.what === "empty_groups") {
		removeGroups(service, FLAGS);
	} else if (what_question_answers.what === "provision_profile_pictures") {
		await photoProvisioning(service)
	} else if (what_question_answers.what === "save_all_users"){
		await saveAllUsers(service)
	} else if (what_question_answers.what === "combine_newest_users"){
		await combineUserProvisioningFiles()
	}
}