import { writeFileSync, readdirSync, readFileSync, rmSync } from "fs"
import path from "path"
import { cwd } from "process"
import crypto from "crypto"
import { getLatestProvisioningFile } from "../helpers/provisioningFiles.js"
import { sendEmail } from "./smartschoolHandler.js"

export const addMailToQueue = async (title, body, receiver) => {
    const uuid = crypto.randomUUID()
    const filepath = path.join(cwd(), `mail_queue/${receiver}_${uuid}.md`)

    const data = {
        receiver: receiver,
        subject: title,
        time: new Date().toUTCString()
    }
    
    const content = `
${JSON.stringify(data)}
----------
${body}`

    await writeFileSync(filepath, content)
}

const listMailQueue = async () => {
    let files = await readdirSync(path.join(cwd(), "mail_queue/"));
    
    return files;
}

const removeMailFromQueue = async (file) => {
    await rmSync(path.join(cwd(), `mail_queue/${file}`))
}

export const readMailFromQueue = async () => {
    const files = await listMailQueue()

    const users = (await getLatestProvisioningFile('combined_users')).content

    for (const file of files) {

        const fileRaw = readFileSync(
            path.join(cwd(), `mail_queue/${file}`),
            "utf-8"
        )

        const fileContents = fileRaw.split('----------')

        const content = {
            data: JSON.parse(fileContents[0].replace(/\n/g, "").replace(/\r/g, "")),
            content: fileContents[1]
        }

        const user = users.find(u => u.smartschool.username == content.data.receiver)

        if(user){
            if(user.smartschool.internalId !== null){
                await sendEmail(content.data.subject, content.content, user.smartschool.internalId)
                await removeMailFromQueue(file)
            }
        }
    }
}