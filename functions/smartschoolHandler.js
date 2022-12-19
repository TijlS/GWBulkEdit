import chalk from "chalk"
import SMSC from "smartschool-client"
import fs from "fs/promises"
import dayjs from "dayjs";

import SMSC_CONF from "../config/smartschool.json" assert { type: 'json' }

const initSMSC = async () => {
    await SMSC.init(SMSC_CONF)   
}

export const saveSMSCUsersToJson = async () => {
    await initSMSC()

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

export const getClasses = async (official) => {
    try{
        await initSMSC()
    
        const options = {
            transformation: {
                id: 'id',
                name: 'name',
                code: 'code',
                description: 'desc',
                official: 'isOfficial'
            }
        }
    
        const res = await SMSC.getClasses(options)
    
        return res.filter(c => {
            if(official) return c.official
        })
    } catch (e) {
        console.log(e)
    }
}

export const getUsersInClass = async (classCode) => {
    try{
        await initSMSC()

        const options = {
            groupId: classCode,
            recursive: false
        }

        const res = await SMSC.getUsers(options)

        return res
    } catch (e) {
        console.log(e)
    }
}

export const getClassesWithUsers = async () => {
    try{
        await initSMSC()

        const res = []

        const classes = await getClasses(true)
        for (const c of classes) {
            const users = await getUsersInClass(c.code)
            res.push({
                className: c.name,
                classCode: c.code,
                users: users.map(user => {
                    return {
                        username: user.gebruikersnaam,
                    }
                })
            })
            
        }

        return res

    }catch (e) {
        console.log(e)
    }
}

export const getSMSCUserFromGoogle = async (user) => {
    await initSMSC()

    const options = {
        userId: user.username
    }

    const res = await SMSC.getUser(options)

    return res
}