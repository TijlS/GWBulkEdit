import fs from "fs";
import inquirer from "inquirer";
import chalk from "chalk";
import { admin_directory_v1, google, GoogleApis } from "googleapis";
import cliProgress from 'cli-progress';
import yargs from "yargs";

const SCOPES = ["https://www.googleapis.com/auth/admin.directory.user"];
const TOKEN_PATH = "token.json";
const whatQuestion = [{
    type: "list",
    message: "What do you want to do?",
    choices: ["Change users primary email"],
    name: "what",
    filter(val) {
        switch (val) {
            case "Change users primary email":
                return 1;
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
        message:
            "Enter the domain name from wich you want to get the users",
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
        message:
            "To wich domain do you want to transfer them?",
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
]

const FLAGS = yargs
    // .option('nosignout', {
    //     description: "Do not sign users out when resetting primary emailadress",
    //     type: 'boolean'
    // }).argv
    .argv

fs.readFile("credentials.json", (err, content) => {
	if (err) {
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

	authorize(JSON.parse(content), listUsers);
});

/**
 *
 * @param {Object} credentials
 * @param {fuction} cb
 */
function authorize(credentials, cb) {
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
                                updateUsersPrimaryEmailByDomain(answers, service)
                            })
                        }
                    });
            }
        });    
}

const updateUsersPrimaryEmailByDomain = (answers, service) => {
    service.users.list(
        {
            domain: answers.domainName
        },
        (err, res) => {
            if (err)
                return console.error("The API returned an error:", err.message);

            const users = res.data.users;
            const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy)
            let i = 0;
            if (users.length) {
                statusBar.start(users.length, 0)
                users.forEach((user) => {
                    let oldEmail = user.primaryEmail
                    oldEmail = oldEmail.split('@')
                    
                    user.primaryEmail = `${oldEmail[0]}@${answers.newDomain}`

                    service.users.update({
                        userKey: user.id,
                        requestBody: user
                    });
                    i++;
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
}