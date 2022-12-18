import inquirer from "inquirer";
import config from "../config/config.json" assert { type: "json" };

export async function domainChooser() {
	let inquirerPrompt = {};
	if (config.domain_prefetch_enabled) {
		inquirerPrompt = {
			type: "list",
			message: "Choose domain",
			choices: config.owned_domains,
			name: "domainName",
            /**
			 *
			 * @param {String} input
			 */
			validate: function (input) {
				let done = this.async();

				setTimeout(() => {
					if (
						!input.includes(".")
					) {
						done("Please provide valid domain");
						return;
					}
					done(null, true);
				}, 500);
			},
		};
	} else {
		inquirerPrompt = {
			type: "input",
			message: "Enter the domain from witch you want to fetch",
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
		};
	}

	const answers = await inquirer.prompt(inquirerPrompt);
	return answers.domainName;
}

export async function orgChooser() {
	inquirerPrompt = {
		type: "input",
		message:
			"Enter the organisation path from wich you want to get the users",
		name: "organisationName",
	};

	const answers = await inquirer.prompt(inquirerPrompt);
	return answers.organisationName;
}
