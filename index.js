import inquirer from "inquirer";
import chalk from "chalk";
import { admin_directory_v1, google, GoogleApis } from "googleapis";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { writeFileSync as fsWriteFileSync } from "fs"
import path from "path";
import { cwd } from "process";
import { OAuth2Client } from "google-auth-library";

import { authorize } from "./functions/auth.js";
import updateUsersPrimaryEmail from "./functions/updateUsersPrimaryEmail.js";
import saveUsersToLocalFile from "./functions/saveUsersToLocalDB.js";
import clearlocalFiles from "./functions/clearLocalFiles.js";
import removeGroups from "./functions/removeGroups.js";
import { saveSMSCUsersToJson } from "./functions/smartschoolHandler.js";
import { startDbViewer } from "./functions/dbViewer.js";

import config from "./config/config.json" assert { type: "json" };

const whatQuestion = [
	{
		type: "list",
		message: "What do you want to do?",
		choices: [
			new inquirer.Separator("USERS"),
			{
				name: "Change users primary email",
				value: 'change_primary_email'
			},
			{
				name: "Save users to local database",
				value: 'save_to_db'
			},
			new inquirer.Separator("GROUPS"),
			{
				name: "Manage organization groups",
				value: "manage_groups"
			},
			{
				name: "Remove all users from groups",
				value: 'empty_groups'
			},
			new inquirer.Separator("SMARTSCHOOL"),
			{
				name: "Save all SMSC users to JSON file",
				value: 'smscs_all_to_json'
			},
			new inquirer.Separator("CONFIG"),
			{
				name: "Clear all files in generated directory",
				value: 'clear_generated'
			},
			new inquirer.Separator("DATABASE"),
			{
				name: "View database online",
				value: 'db_viewer'
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
const domainQueryQuestions = [
	{
		type: "input",
		message: "Enter the domain name from wich you want to get the users",
		name: "domainName",
		/**
		 *
		 * @param {String} input
		 */
		validate: function (input) {
			let done = this.async();

			setTimeout(() => {
				if (!input.includes(".")) {
					done("Please provide valid domain");
					return;
				}
				done(null, true);
			}, 500);
		},
	},
	{
		type: "input",
		message: "To wich domain do you want to transfer them?",
		name: "newDomain",
		/**
		 *
		 * @param {String} input
		 */
		validate: function (input) {
			let done = this.async();

			setTimeout(() => {
				if (!input.includes(".")) {
					done("Please provide valid domain");
					return;
				}
				done(null, true);
			}, 500);
		},
	},
];
const organisationQueryQuestions = [
	{
		type: "input",
		message:
			"Enter the organisation path from wich you want to get the users",
		name: "organisationName",
	},
	{
		type: "input",
		message: "To wich domain do you want to transfer them?",
		name: "newDomain",
		/**
		 *
		 * @param {String} input
		 */
		validate: function (input) {
			let done = this.async();

			setTimeout(() => {
				if (!input.includes(".")) {
					done("Please provide valid domain");
					return;
				}
				done(null, true);
			}, 500);
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
			],
			name: "configOptions",
		});
		if (config_options_answers.configOptions.includes("enable_smsc")) {
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
			if(smsc_config_answers.pass !== true){
				console.log(`
	${chalk.redBright('Configuration failed')}
	Try again!
				`)
			}
		}
		console.log(`
${chalk.greenBright("Configuration succeeded!")}
The application will stop now, please restart it.			
		`);

		config.is_first_time = false;

		//Rewrite config file
		fsWriteFileSync(path.join(cwd(), 'config/config.json'), JSON.stringify(config, null, 4))

		return process.exit(0);
	}

	//Create Google Admin Service
	const service = google.admin({
		version: "datatransfer_v1",
		auth,
		timeout: 1000,
	});

	//Save owned domains to config
	// TODO: Needs testing!
	if(!FLAGS.dev){
		const domains = (await service.domains.list({
			customer: 'my_customer'
		})).data.domains
		config.owned_domains = domains.map(domain => {
			return domain.domainName
		})
		fsWriteFileSync(path.join(cwd(), 'config/config.json'), JSON.stringify(config, null, 4))
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
	if (what_question_answers.what === 'change_primary_email') {
		inquirer.prompt(queryTypeQuestion).then((answers) => {
			if (answers.queryType == 1) {
				inquirer.prompt(domainQueryQuestions).then((answers) => {
					updateUsersPrimaryEmail(answers, service, 1, FLAGS);
				});
			} else if (answers.queryType == 2) {
				inquirer.prompt(organisationQueryQuestions).then((answers) => {
					updateUsersPrimaryEmail(answers, service, 2, FLAGS);
				});
			}
		});
	} else if (what_question_answers.what === 'manage_groups') {
		console.warn(
			chalk.white.bgYellow(" Warning! This feature is in development ")
		);
		process.exit(1);
	} else if (what_question_answers.what === 'save_to_db') {
		saveUsersToLocalFile(service, FLAGS);
	} else if (what_question_answers.what === 'clear_generated') {
		clearlocalFiles();
	} else if (what_question_answers.what === 'empty_groups') {
		removeGroups(service, FLAGS);
	} else if (what_question_answers.what === 'smscs_all_to_json') {
		saveSMSCUsersToJson();
	} else if (what_question_answers.what === 'db_viewer') {
		startDbViewer();
	}
}
