import inquirer from "inquirer";
import chalk from "chalk";
import { google } from "googleapis";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import startAuth from "./import/auth.js";
import updateUsersPrimaryEmail from "./import/updateUsersPrimaryEmail.js";
import saveUsersToLocalFile from "./import/saveUsersToLocalFile.js";

const whatQuestion = [
	{
		type: "list",
		message: "What do you want to do?",
		choices: [
			"Change users primary email",
			"Manage organization groups",
			"Save users to local file",
		],
		name: "what",
		filter(val) {
			switch (val) {
				case "Change users primary email":
					return 1;
				case "Manage organization groups":
					return 2;
				case "Save users to local file":
					return 3;
				default:
					return 1;
			}
		},
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
	// .option('nosignout', {
	//     description: "Do not sign users out when resetting primary emailadress",
	//     type: 'boolean'
	// }).argv
	.option("dev", {
		description: "Skip the part of creating/updating things",
		type: "boolean",
	})
	.parse();

startAuth(aksQuestions, FLAGS);

/**
 * Lists the first 10 users in the domain.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function aksQuestions(auth) {
	const service = google.admin({ version: "directory_v1", auth });

	inquirer.prompt(whatQuestion).then((answers) => {
		if (answers.what == 1) {
			inquirer.prompt(queryTypeQuestion).then((answers) => {
				if (answers.queryType == 1) {
					inquirer.prompt(domainQueryQuestions).then((answers) => {
						updateUsersPrimaryEmail(answers, service, 1, FLAGS);
					});
				} else if (answers.queryType == 2) {
					inquirer
						.prompt(organisationQueryQuestions)
						.then((answers) => {
							updateUsersPrimaryEmail(answers, service, 2, FLAGS);
						});
				}
			});
		} else if (answers.what == 2) {
			console.warn(
				chalk.white.bgYellow(
					" Warning! This feature is in development "
				)
			);
			process.exit(1);
		} else if (answers.what == 3) {
			saveUsersToLocalFile(service, FLAGS);
		}
	});
}