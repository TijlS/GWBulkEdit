import chalk from "chalk"
import fs from "fs"
import { admin_directory_v1 } from "googleapis"
import path from "path"
import { cwd } from "process"
import { getLatestProvisioningFile, updateProvisioningFile } from "../helpers/provisioningFiles.js"
import { getUserProfilePicture } from "./smartschoolHandler.js"


/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const photoProvisioning = async (service) => {
    const users_file = await getLatestProvisioningFile('test')

    for (const user of users_file.content) {
        if(!user.custom.photo_updated && user.google.length !== 0){
            user.custom.photo_updated = true
            const photo = await getUserProfilePicture(user.smartschool.internalId)
    
            try {
                const res = await service.users.photos.update({
                    userKey: user.google[0].id,
                    requestBody: {
                        photoData: photo,
                        width: 256,
                        height: 256
                    }
                })
                console.log(res.data.width)
                console.log(res.data.height)
                console.log(res.data.mimeType)
            } catch (error) {
                console.error(`${chalk.redBright('ERROR:')} ${error}`)
                process.exit(1)
            }
        }
    }

    await updateProvisioningFile(users_file.file, users_file.content)
    console.log(`${chalk.bgGreenBright.white('Finished!')}`)
    process.exit(0)
}