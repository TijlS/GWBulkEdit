import chalk from "chalk";
import cliProgress from "cli-progress";
import dayjs from "dayjs";
import fs from "fs";
import inquirer from "inquirer";
import sqlite from "sqlite3";
import { domainChooser } from "../helpers/domain_org_chooser.js";
import { getUsers } from "./getUsers.js";

const db = new sqlite.Database(`config/database.db`);
let fromDomain = false;
let domainName;

const askDomain = async () => {
	let ans = {}
	await inquirer
		.prompt({
			type: "confirm",
			name: "selectFromDomain",
			message: "Select from (sub/other)domain?",
			default: false,
		})
		.then(async (answers) => {
			ans.selectFromDomain = answers.selectFromDomain
			if (answers.selectFromDomain == true) {
				fromDomain == true;
				const domain = await domainChooser()

				ans.domainName = domain
				domainName = domain
			}
		});

	return ans
};

const saveUsersToLocalFile = async (service, FLAGS) => {
	await askDomain().then(answers => {
		if(answers.selectFromDomain) {
			fromDomain = true
			domainName = answers.domainName
		}
	})

	let filename = `users_${dayjs().format(
		"DD-MM-YYYY_HH-mm"
	)}${FLAGS.dev ? '_DEV' : ''}.json`;

	console.log(chalk.grey(`A backup .json file will be generated: generated/${filename}`))

	if (FLAGS.dev !== true) {
		let searchQuery = {};
		if (fromDomain == true) {
			searchQuery = {
				domain: domainName,
			};
		}
		const users = await getUsers(searchQuery, service)

		const statusBar = new cliProgress.SingleBar(
			{},
			cliProgress.Presets.shades_classic
		);
		if (users.length) {
			statusBar.start(1, 0);

			// db.serialize(() => {
			// 	db.run(`
			// 		CREATE TABLE IF NOT EXISTS saved_users (
			// 			uuid VARCHAR(255)
			// 			primaryEmail VARCHAR(255)
			// 			username VARCHAR(255)
			// 			name JSON
			// 			isAdmin BOOLEAN
			// 			emails JSON
			// 			aliases JSON
			// 			nonEditableAliases JSON
			// 			orgUnitPath TEXT
			// 			updated VARCHAR(255)
			// 		)
			// 	`);
			// 	const sql = db.prepare(
			// 		"INSERT INTO saved_users VALUES (?), (?), (?), (?), (?), (?), (?), (?), (?), (?)"
			// 	);
			// 	users.forEach((user) => {
			// 		sql.run(
			// 			user.id,
			// 			user.primaryEmail ?? "",
			// 			user.username ?? "",
			// 			JSON.stringify(user.name),
			// 			user.isAdmin,
			// 			JSON.stringify(user.emails),
			// 			JSON.stringify(user.aliases),
			// 			JSON.stringify(user.nonEditableAliases),
			// 			user.orgUnitPath,
			// 			dayjs().format("DD-MM-YYYY_HH-mm")
			// 		);
			// 	});
			// 	sql.finalize();
			// });
			// db.close()

			fs.writeFile(
				`generated/${filename}`,
				JSON.stringify(users, null, 4),
				(err) => {
					if (err)
						return console.error(
							chalk.redBright(
								"The API returned an error:",
								err.message
							)
						);
					statusBar.increment(1);
					statusBar.stop();
					console.log(chalk.white.bgGreenBright("Finished!"));
					process.exit(0);
				}
			);
		} else {
			console.log(chalk.white.bgYellow("No users found."));
			process.exit(0)
		}
	} else {
		let info = { info: "No data inserted, DEV mode was activated" };
		fs.writeFile(`generated/${filename}`, JSON.stringify(info, null, 4), (err) => {
			if (err)
				return console.error(chalk.redBright("The API returned an error:", err.message));
			console.log(
				chalk.white.bgGreenBright("Finished! (You are in dev mode)")
			);
			process.exit(0);
		});
	}
};

export default saveUsersToLocalFile;
