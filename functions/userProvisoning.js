import path from "path"

import { admin_directory_v1 } from "googleapis"
import { getUsers } from "./getUsers.js"
import { getSMSCUsers } from "./smartschoolHandler.js"

const saveFile = (data, name) => {
    let filename = `${name}@${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

    fs.writeFile(
        path.join(process.cwd(), `provisioning/${filename}`),
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

    saveFile(smsc_users.map(user => {
        return {
            username: user.gebruikersnaam,
            internalId: user.internnummer,
            name: {
                surname: user.voornaam,
                lastname: user.naam
            },
            queryField: user.sorteerveld
        }
    }), 'users_SMSC')
    saveFile(google_users, 'users_GOOGLE') //TODO: Select only needed fields


}