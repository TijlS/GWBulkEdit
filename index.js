import fs from "fs";
import inquirer from "inquirer";
import chalk from "chalk";
import { google } from "googleapis";
import cliProgress from 'cli-progress';
import yargs from "yargs";
import { hideBin } from "yargs/helpers"
import dayjs from 'dayjs';

const SCOPES = ["https://www.googleapis.com/auth/admin.directory.user"];
const TOKEN_PATH = "token.json";
const whatQuestion = [{
    type: "list",
    message: "What do you want to do?",
    choices: ["Change users primary email", "Manage organization groups", "Save all users to local file"],
    name: "what",
    filter(val) {
        switch (val) {
            case "Change users primary email":
                return 1;
            case "Manage organization groups":
                return 2;
			case "Save all users to local file":
				return 3;
            default:
                return 1;
        }
    },
}]
const queryTypeQuestion = [
    {
        type: "list",
        message:
            "From with property do you want to fetch the users?",
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
]
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
		message: "Enter the organisation path from wich you want to get the users",
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
    .option('dev', {
        description: "Skip the part of creating/updating things",
        type: 'boolean'
    })
    .parse()

fs.readFile("credentials.json", (err, content) => {
	if (err && FLAGS.dev !== true) {
        if(err.code == 'ENOENT'){
            console.error(chalk.white(`
${chalk.white.bgYellow('Make sure you have initialized the project correctly ')}

1) Create a project on Google Cloud and enable the 'Admin SDK API' 
    (https://developers.google.com/workspace/guides/create-project) 
2) Authorization credentials for a desktop application. 
    (https://developers.google.com/workspace/guides/create-credentials) 
${chalk.white.bgRedBright('3) Place the credentials.json in this folder')}
4) Make sure the Google Workspace domain has API access enabled 
    (https://support.google.com/a/answer/60757) 
5) Run this with an account with administrator privileges
            `))
            process.exit(1)
        }else{
            console.error(chalk.white.bgRedBright('An error occured: '))
            console.error(err)
            process.exit(1)
        }
    }
	if(FLAGS.dev !== true){
		authorize(JSON.parse(content), listUsers);
	}else{
		authorize(null, listUsers);
	}

});

/**
 *
 * @param {Object} credentials
 * @param {fuction} cb
 */
function authorize(credentials, cb) {
	
	if(FLAGS.dev !== true){
		const { client_secret, client_id, redirect_uris } = credentials.installed;
	
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
	}else{
		cb(null)
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

/**
 * Lists the first 10 users in the domain.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listUsers(auth) {
	const service = google.admin({ version: "directory_v1", auth });
    
    inquirer
        .prompt(whatQuestion)
        .then((answers) => {
            if (answers.what == 1) {
                inquirer
                    .prompt(queryTypeQuestion)
                    .then((answers) => {
                        if (answers.queryType == 1) {
                            inquirer.prompt(domainQueryQuestions).then(answers => {
                                updateUsersPrimaryEmail(answers, service, 1)
                            })
                        } else if (answers.queryType == 2){
                            inquirer.prompt(organisationQueryQuestions).then((answers) => {
                                updateUsersPrimaryEmail(answers, 2);
                            });
                        }
                    });
            }
			else if (answers.what == 2){
				console.warn(chalk.white.bgYellow(' Warning! This feature is in development '))
				process.exit(1)
			}
			else if (answers.what == 3){
				saveUsersToLocalFile(service);
			}
        });    
}

const sleep = time => {
	return new Promise(resolve => setTimeout(resolve, time))
}

const updateUsersPrimaryEmail = async (answers, service, queryType) => {
	let keepOldDomainAsAlias = true;

	await inquirer.prompt({
		type: 'confirm',
		name: 'keepOldDomainAsAlias',
		message: 'Keep the old domain as an alias?',
		default: true
	}).then(a => {
		if(a.keepOldDomainAsAlias == false){
			keepOldDomainAsAlias = false
		}
	})

    let query = {}
    switch (queryType) {
        case 1:
            query = { domain : answers.domainName }
            break;
        case 1:
            query = { query: { orgUnitPath: answers.organisationName } }
            break;
    }
	if(FLAGS.dev !== true){
		service.users.list(
			query,
			(err, res) => {
				if (err)
					return console.error("The API returned an error:", err.message);
	
				const users = res.data.users;
				const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy)
				let i = 0;
				if (users.length) {
					statusBar.start(users.length, 0)
					users.forEach(async (user) => {
						let oldEmail = user.primaryEmail
						let oldEmailSplit = oldEmail.split('@')
						
						user.primaryEmail = `${oldEmailSplit[0]}@${answers.newDomain}`
	
						try {
							service.users.update({
								userKey: user.id,
								requestBody: user
							});

							if(keepOldDomainAsAlias){
								service.users.aliases.insert({
									userKey: user.id,
									requestBody: {
										"alias": oldEmail
									}
								})
							}
						} catch (err) {
							console.error(chalk.white.bgRedBright('An error occured: '))
							console.error(err)
							process.exit(1)
						}
						i++;
						await sleep(1000)
						statusBar.update(i)
					});
					statusBar.stop()
					console.log(chalk.white.bgGreenBright('Finished!'))
					process.exit(0)
				} else {
					console.log(chalk.white.bgYellow('No users found.'));
				}
			}
		);
	}else{
		const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy)
		statusBar.start(100, 0)
		for (let i = 0; i < 100; i++) {
			await sleep(1000)
			statusBar.update(i)
		}
		statusBar.stop()
		console.log(chalk.white.bgGreenBright('Finished!'))
		process.exit(0)
	}
}

const saveUsersToLocalFile = async (service) => {
	if(FLAGS.dev !== true){
		service.users.list(
			{},
			(err, res) => {
				if (err)
					return console.error("The API returned an error:", err.message);
	
				const users = res.data.users;
				const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy)
				let i = 0;
				if (users.length) {
					statusBar.start(1, 0)
					
					let filename = `users_${dayjs().format('DD-MM-YYYY_HH-mm')}.json`

					fs.writeFileSync(`config/${filename}`, JSON.stringify(users));

					statusBar.increment(1)
					statusBar.stop()
					console.log(chalk.white.bgGreenBright('Finished!'))
					process.exit(0)
				} else {
					console.log(chalk.white.bgYellow('No users found.'));
				}
			}
		);
	}else{
		let info = { "info": "No data inserted, DEV mode was activated" }
		let filename = `users_${dayjs().format('DD-MM-YYYY_HH-mm')}.json`

		fs.writeFileSync(`config/${filename}`, JSON.stringify(info));

		console.log(chalk.white.bgGreenBright('Finished! (You are in dev mode)'))
		process.exit(0)
	}
}