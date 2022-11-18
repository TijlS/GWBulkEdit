import chalk from "chalk"
import SMSC from "smartschool-client"
import fs from "fs/promises"
import path from "path";
import { cwd } from "process"
import dayjs from "dayjs";

const CONFIG_PATH = path.join(cwd(), "config/smartschool.json");

const getSMSCConfig = async () => {
    const conf_raw = await fs.readFile(CONFIG_PATH)
    const conf = JSON.parse(conf_raw)
    if(!conf.init){
        console.error(chalk.redBright(`
ERROR! Smartschool webservice not initiated! 
Edit the config file in config/smartschool.json 
The following properties are required:\n
${chalk.italic.gray(`\`apiWSDL: 'https://<jouwschool>.smartschool.be/Webservices/V3?wsdl'\`,
\`accessCode: '<api_access_code>'\``)}`))
        return process.exit(1)
    }

    await SMSC.init(conf)   
}

export const saveSMSCUsersToJson = async () => {
    await getSMSCConfig()

    const users = await SMSC.getUsers()

    let filename = `users_SMSC_${dayjs().format("DD-MM-YYYY_HH-mm")}`;

    fs.writeFile(
        `generated/${filename}`,
        JSON.stringify(users)
    ).catch(err => {
        return console.error(
            chalk.redBright(
                "The API returned an error:",
                err.message
            )
        );
    }).then(() => {
        console.log(chalk.white.bgGreenBright("Finished!"));
        return process.exit(0);
    })
}

const getClassess = async () => {
    const options = {
        transformation: {
            id: 'id',
            name: 'name',
            code: 'code',
            description: 'desc'
        }
    }

    const res = await SMSC.getClasses(options)

    return res
}

export const getSMSCUserFromGoogle = async (user) => {
    await getSMSCConfig()

    const options = {
        userId: user.username
    }

    const res = await SMSC.getUser(options)

    return res
}