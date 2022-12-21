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

    const users = await SMSC.getUsers()

    return users
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

        return res.filter(c => {
            if (official) return c.official
        })
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