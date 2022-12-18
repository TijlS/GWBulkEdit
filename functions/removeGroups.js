import chalk from "chalk";
import cliProgress from "cli-progress";
import inquirer from "inquirer";
import { domainChooser } from "../helpers/domain_org_chooser.js";

const removeGroups = async (service, FLAGS) => {
	let fromDomain = false;
	let domainName;
	await inquirer
		.prompt({
			type: "confirm",
			name: "selectFromDomain",
			message: "Select groups from (sub/other)domain?",
			default: false,
		})
		.then(async (answers) => {
			if (answers.selectFromDomain == true) {
				fromDomain == true;
				domainName = await domainChooser()
			}
		});
	if (FLAGS.dev !== true) {
		let searchQuery = {};
		if (fromDomain == true) {
			searchQuery = {
				domain: domainName,
			};
		}
		await service.users.list(searchQuery, (err, res) => {
			if (err)
				return console.error(chalk.redBright("The API returned an error:", err.message));

			const users = res.data.users;
			const statusBar = new cliProgress.SingleBar(
				{},
				cliProgress.Presets.shades_classic
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
							return console.error(chalk.redBright(
								"The API returned an error:",
								err.message)
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
		console.log(
			chalk.white.bgGreenBright("Finished! (You are in dev mode)")
		);
		process.exit(0);
	}
};

export default removeGroups;
