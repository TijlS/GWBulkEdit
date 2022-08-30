import fs from "fs";
import chalk from "chalk";
import path from "path";

const clearlocalFiles = async () => {
	console.log(chalk.green("Clearing files..."));
	const files = await fs.readdirSync("generated/", { encoding: 'utf-8' });

	for (const file of files) {
		fs.unlink(path.join("config", file), (err) => {
			if (err) throw err;
		});
	}
	console.log(chalk.green("Complete!"));
};

export default clearlocalFiles;
