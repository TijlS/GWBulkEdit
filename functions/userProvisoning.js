import path from "path"
import dayjs from "dayjs"
import fs from "fs/promises"
import chalk from "chalk"
import { cwd } from "process"

import { admin_directory_v1 } from "googleapis"
import { getUsers } from "./getUsers.js"
import { getClassesWithUsers, getSMSCUsers } from "./smartschoolHandler.js"

const saveFile = (data, name) => {
    let filename = `${name}@${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

    fs.writeFile(
        path.join(cwd(), `provisioning/${filename}`),
        JSON.stringify(data)
    ).catch(err => {
        return console.error(
            chalk.redBright(
                "The API returned an error:",
                err.message
            )
        );
    }).then(() => {
        console.log(chalk.white.bgGreenBright(`Finished writing ${filename}`));
    })
}

/**
 * 
 * @param {admin_directory_v1.Admin} service 
 */
export const saveAllUsers = async (service) => {
    const smsc_users = await getSMSCUsers()
    const google_users = await getUsers({ customer: 'my_customer' }, service)
    const classesWithUsers = await getClassesWithUsers()

    saveFile(smsc_users.map(user => {
        return {
            username: user.gebruikersnaam,
            internalId: user.internnummer,
            name: {
                surname: user.voornaam,
                lastname: user.naam
            },
            queryField: user.sorteerveld,
            status: user.status,
            leaver: user.schoolverlater,
            lastLogin: user.last_successful_login
        }
    }), 'users_SMSC')
    saveFile(google_users.map(user => {
        return {
            id: user.id,
            email: user.primaryEmail,
            name: {
                surname: user.name.givenName,
                lastname: user.name.familyName,
                fullname: user.name.fullName
            },
            orgUnit: user.orgUnitPath
        }
    }), 'users_GOOGLE')
    
    saveFile(classesWithUsers, 'classes_SMSC')

}

