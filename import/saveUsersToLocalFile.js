import chalk from "chalk";
import cliProgress from "cli-progress";
import dayjs from "dayjs";
import fs from "fs";
import inquirer from "inquirer"

const saveUsersToLocalFile = async (service, FLAGS) => {
	let fromDomain = false;
	let domainName;
	await inquirer.prompt(
		{
			type: "confirm",
			name: "selectFromDomain",
			message: "Select from domain?",
			default: false
		}
	).then(async (answers) =>  {
		if(answers.selectFromDomain == true){
			fromDomain == true;
			await inquirer.prompt(
				{
					type: "input",
					name: "domainName",
					message: "Domainname",
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
				}
			).then(answers => {
				domainName == answers.domainName;
			})
		}
	})
	if (FLAGS.dev !== true) {
		let searchQuery = {};
		if(fromDomain == true){
			searchQuery = {
				domain: domainName
			}
		}
		await service.users.list(searchQuery, (err, res) => {
			if (err)
				return console.error("The API returned an error:", err.message);

			const users = res.data.users;
			const statusBar = new cliProgress.SingleBar(
				{},
				cliProgress.Presets.shades_classic,
			);
			if (users.length) {
				statusBar.start(1, 0);

				let filename = `users_${dayjs().format(
					"DD-MM-YYYY_HH-mm"
				)}.json`;

				fs.writeFile(
					`config/${filename}`,
					JSON.stringify(users),
					(err) => {
						if (err)
							return console.error(
								"The API returned an error:",
								err.message
							);
						statusBar.increment(1);
						statusBar.stop();
						console.log(chalk.white.bgGreenBright("Finished!"));
						process.exit(0);
					}
				);
			} else {
				console.log(chalk.white.bgYellow("No users found."));
			}
		});
	} else {
		let info = { info: "No data inserted, DEV mode was activated" };
		let filename = `users_${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

		fs.writeFile(`config/${filename}`, JSON.stringify(info), (err) => {
			if (err)
				return console.error("The API returned an error:", err.message);
			console.log(
				chalk.white.bgGreenBright("Finished! (You are in dev mode)")
			);
			process.exit(0);
		});
	}
};

export default saveUsersToLocalFile