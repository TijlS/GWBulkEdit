import { google } from "googleapis";
import fs from "fs";
import chalk from "chalk";

const SCOPES = ["https://www.googleapis.com/auth/admin.directory.user"];
const TOKEN_PATH = "token.json";

const startAuth = (cb, FLAGS) => {
	fs.readFile("credentials.json", (err, content) => {
		if (err && FLAGS.dev !== true) {
			if (err.code == "ENOENT") {
				console.error(
					chalk.white(`
    ${chalk.white.bgYellow(
		"Make sure you have initialized the project correctly "
	)}
    
    1) Create a project on Google Cloud and enable the 'Admin SDK API' 
        (https://developers.google.com/workspace/guides/create-project) 
    2) Authorization credentials for a desktop application. 
        (https://developers.google.com/workspace/guides/create-credentials) 
    ${chalk.white.bgRedBright("3) Place the credentials.json in this folder")}
    4) Make sure the Google Workspace domain has API access enabled 
        (https://support.google.com/a/answer/60757) 
    5) Run this with an account with administrator privileges
                `)
				);
				process.exit(1);
			} else {
				console.error(chalk.white.bgRedBright("An error occured: "));
				console.error(err);
				process.exit(1);
			}
		}
		if (FLAGS.dev !== true) {
			authorize(JSON.parse(content), cb, FLAGS);
		} else {
			authorize(null, cb, FLAGS);
		}
	});
};

/**
 *
 * @param {Object} credentials
 * @param {fuction} cb
 */
function authorize(credentials, cb, FLAGS) {
	if (FLAGS.dev !== true) {
		const { client_secret, client_id, redirect_uris } =
			credentials.installed;

		const oauth2Client = new google.auth.OAuth2(
			client_id,
			client_secret,
			redirect_uris[0]
		);
		fs.readFile(TOKEN_PATH, (err, token) => {
			if (err) return getNewToken(oauth2Client, cb);

			oauth2Client.credentials = JSON.parse(token);
			cb(oauth2Client);
		});
	} else {
		cb(null);
	}
}

/**
 *
 * @param {google.auth.OAuth2} oauth2Client
 * @param {getEventsCallback} cb
 */
function getNewToken(oauth2Client, cb) {
	const authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
	});

	console.log(
		chalk.white.bgYellow(
			"Authentication needed! Authenticate by visiting this url:"
		)
	);
	console.log(authUrl);
	inquirer
		.prompt([
			{
				type: "input",
				message: "Enter the code from that page: ",
				name: "authCode",
			},
		])
		.then((answers) => {
			oauth2Client.getToken(answers.authCode, (err, token) => {
				if (err) {
					console.error(
						chalk.white.bgRedBright("An error occured: ")
					);
					console.error(err);
					process.exit(1);
				}

				oauth2Client.credentials = token;
				storeToken(token);
				cb(oauth2Client);
			});
		});
}

function storeToken(token) {
	fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
		if (err) {
			console.error(chalk.white.bgRedBright("An error occured: "));
			console.error(err);
			process.exit(1);
		}

		console.log(chalk.white.bgGreenBright("Token stored to " + TOKEN_PATH));
	});
}

export default startAuth;
