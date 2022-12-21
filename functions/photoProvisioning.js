import chalk from "chalk"
import { admin_directory_v1 } from "googleapis"
import { getLatestProvisioningFile } from "../helpers/provisioningFiles.js"
import { getUserProfilePicture } from "./smartschoolHandler.js"


/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const photoProvisioning = async (service) => {
    const users = await getLatestProvisioningFile('combined_users')

    for (const user of users.content) {
        if(!user.custom.photo_updated){
            const photo = await getUserProfilePicture(user.smartschool.internalId)
    
            try {
                await service.users.photos.update({
                    userKey: user.google.id,
                    requestBody: {
                        photoData: photo
                    }
                })
            } catch (error) {
                console.error(`${chalk.redBright('ERROR:')} ${error}`)
                process.exit(1)
            }
        }
    }
}