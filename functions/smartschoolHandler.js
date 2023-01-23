import chalk from "chalk"
import SMSC from "smartschool-client"
import fs from "fs/promises"
import dayjs from "dayjs";

import SMSC_CONF from "../config/smartschool.json" assert { type: 'json' }

const initSMSC = async () => {
    await SMSC.init(SMSC_CONF)
}

export const getSMSCUsers = async () => {
    await initSMSC()

    console.time('fetch_smsc')
    console.log(`${chalk.gray.italic('Fetching all SMSC users...')}`)
    const users = await SMSC.getUsers()
    console.log(`${chalk.gray.italic(`Done`)}`)
    console.timeEnd('fetch_smsc')

    return users
}

export const getUser = async (username) => {
    await initSMSC()

    const user = await SMSC.getUser({ userId: username })

    return user
}

export const getClasses = async (official) => {
    try {
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

        return res.filter(c => 
            c.official == official
        )
    } catch (e) {
        console.log(e)
    }
}

export const getGroups = async () => {
    try {
        await initSMSC()

        const options = {
            flat: true
        }

        const res = await SMSC.getGroups(options)

        return res
    } catch (e) {
        console.log(e)
    }
}


export const getUsersInClass = async (classCode) => {
    try {
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
    try {
        await initSMSC()

        const res = []

        console.time('fetch_classes')
        console.log(`${chalk.italic.gray('Fetching classes with users...')}`)
        const classes = await getClasses(true)
        for (const c of classes) {
            const users = await getUsersInClass(c.code)
            res.push({
                className: c.name,
                classCode: c.code,
                users: users.map(user => {
                    return {
                        username: user.gebruikersnaam,
                        internalId: user.internnummer
                    }
                })
            })
            
        }
        console.log(`${chalk.italic.gray('Done!')}`)
        console.timeEnd('fetch_classes')

        return res

    } catch (e) {
        console.log(e)
    }
}

export const getGroupsWithUsers = async () => {
    try {
        await initSMSC()

        const res = []

        console.time('fetch_groups')
        console.log(`${chalk.italic.gray('Fetching groups with users...')}`)
        const groups = await getGroups()
        for (const g of groups) {
            const users = g.code ? await getUsersInClass(
                g.code
            ) : []
            res.push({
                groupName: g.name,
                groupCode: g.code,
                children: g.children,
                users: users?.map(user => {
                    return {
                        username: user.gebruikersnaam,
                        internalId: user.internnummer
                    }
                })
            })            
        }

        console.log(`${chalk.italic.gray('Done!')}`)
        console.timeEnd('fetch_groups')

        return res

    } catch (e) {
        console.log(e)
    }
}

export const getUserProfilePicture = async (userId) => {
    try {
        await initSMSC()

        const profilePicture = await SMSC.getUserPhoto({ userName: userId })

        return profilePicture

    } catch (e) {
        console.log(e)
    }
}

export const sendEmail = async (title, body, to, from = 'Null') => {
    try{
        await initSMSC()

        await SMSC.sendMessage({
            userName: to,
            title,
            body,
            fromUser: from
        })
    } catch (e) {
        console.log(e)
    }
}