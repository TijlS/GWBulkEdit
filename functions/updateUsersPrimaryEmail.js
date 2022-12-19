import inquirer from "inquirer";
import chalk from "chalk";
import cliProgress from "cli-progress";

import { getUsers } from "./getUsers.js";
import { admin_directory_v1 } from "googleapis";

const sleep = (time) => {
	return new Promise((resolve) => setTimeout(resolve, time));
};

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
const updateUsersPrimaryEmail = async (
	domain,
	orgUnitPath,
	service,
	queryType,
	FLAGS
) => {
	const inquirerAnswers = await inquirer.prompt([
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
					if (
						!input.includes(".")
					) {
						done("Please provide valid domain");
						return;
					}
					done(null, true);
				}, 500);
			},
		}]
	);

	let query = {};
	switch (queryType) {
		case 1:
			query = { domain: domain };
			break;
		case 2:
			query = { query: `orgUnitPath=/${orgUnitPath}`, viewType: "admin_view", domain: domain };
			break;
	}
	if (FLAGS.dev !== true) {
		const users = await getUsers(query, service);

		const statusBar = new cliProgress.SingleBar(
			{},
			cliProgress.Presets.shades_classic
		);
		let i = 0;
		let amountOfRequest = 0;
		if (users.length) {
			// statusBar.start(users.length, 0);
			for (const user of users) {
				let oldEmail = user.primaryEmail;
				let oldEmailSplit = oldEmail.split("@");

				let newEmail = `${oldEmailSplit[0]}@${inquirerAnswers.newDomain}`;

				try {
					if (amountOfRequest >= 2350) {
						console.warn(
							chalk.white.bold.bgYellow("WARNING: ") +
								chalk.white(
									"The default limit of 2400 request per minute is almost reached. To make sure that everything will be completed, the program will wait for 30 seconds."
								)
						);
						sleep(30000);
						amountOfRequest = 0;
					}

					await service.users.update({
						userKey: user.id,
						requestBody: {
							primaryEmail: newEmail,
						},
					});
					console.log(`${chalk.gray('Update:')} ${user.name.fullName}'s email changed to ${newEmail}`)
					amountOfRequest++;

					if (FLAGS.signout) {
						await service.users.signOut({
							userKey: user.id,
						});
						amountOfRequest++;
					}
				} catch (err) {
					console.error(chalk.redBright("An error occured: " + err));
					process.exit(1);
				}
				i++;
				// await sleep(1000);
				// statusBar.update(i);
			};
			// statusBar.stop();
			console.log(chalk.white.bgGreenBright("Finished!"));
			process.exit(0);
		} else {
			console.log(chalk.white.bgYellow("No users found."));
		}
	} else {
		const statusBar = new cliProgress.SingleBar(
			{},
			cliProgress.Presets.shades_classic
		);
		statusBar.start(100, 0);
		for (let i = 0; i < 100; i++) {
			await sleep(1000);
			statusBar.update(i);
		}
		statusBar.stop();
		console.log(chalk.white.bgGreenBright("Finished!"));
		process.exit(0);
	}
};

export default updateUsersPrimaryEmail;
