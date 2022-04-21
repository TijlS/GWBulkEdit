import inquirer from "inquirer";
import chalk from "chalk";
import cliProgress from "cli-progress";

const sleep = (time) => {
	return new Promise((resolve) => setTimeout(resolve, time));
};

const updateUsersPrimaryEmail = async (answers, service, queryType, FLAGS) => {
	let keepOldDomainAsAlias = true;

	await inquirer
		.prompt({
			type: "confirm",
			name: "keepOldDomainAsAlias",
			message: "Keep the old domain as an alias?",
			default: true,
		})
		.then((a) => {
			if (a.keepOldDomainAsAlias == false) {
				keepOldDomainAsAlias = false;
			}
		});

	let query = {};
	switch (queryType) {
		case 1:
			query = { domain: answers.domainName };
			break;
		case 1:
			query = { query: { orgUnitPath: answers.organisationName } };
			break;
	}
	if (FLAGS.dev !== true) {
		service.users.list(query, (err, res) => {
			if (err)
				return console.error("The API returned an error:", err.message);

			const users = res.data.users;
			const statusBar = new cliProgress.SingleBar(
				{},
				cliProgress.Presets.shades_classic,
			);
			let i = 0;
			if (users.length) {
				statusBar.start(users.length, 0);
				users.forEach(async (user) => {
					let oldEmail = user.primaryEmail;
					let oldEmailSplit = oldEmail.split("@");

					user.primaryEmail = `${oldEmailSplit[0]}@${answers.newDomain}`;

					try {
						service.users.update({
							userKey: user.id,
							requestBody: user,
						});

						if (keepOldDomainAsAlias) {
							service.users.aliases.insert({
								userKey: user.id,
								requestBody: {
									alias: oldEmail,
								},
							});
						}
					} catch (err) {
						console.error(
							chalk.white.bgRedBright("An error occured: ")
						);
						console.error(err);
						process.exit(1);
					}
					i++;
					await sleep(1000);
					statusBar.update(i);
				});
				statusBar.stop();
				console.log(chalk.white.bgGreenBright("Finished!"));
				process.exit(0);
			} else {
				console.log(chalk.white.bgYellow("No users found."));
			}
		});
	} else {
		const statusBar = new cliProgress.SingleBar(
			{},
			cliProgress.Presets.shades_classic,
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

export default updateUsersPrimaryEmail