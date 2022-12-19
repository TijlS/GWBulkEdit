import { admin_directory_v1 } from "googleapis"
import fs from "fs"
import dayjs from "dayjs";
import chalk from "chalk";

/**
 * 
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getGoogleGroups = async (service) => {
    let res = [];
	const requestPages = async (options) => {
		try {
			const pageRes = await service.groups.list({
                customer: "my_customer"
            });
			res = [...res, ...pageRes.data.groups];
			if (pageRes.data.nextPageToken) {
				options.pageToken = pageRes.data.nextPageToken;
				await requestPages(options);
			}
		} catch (err) {
			console.error(chalk.redBright(`An error occured: ${err}`));
			process.exit(0);
		}
	};

	await requestPages(query);

	return res;
}

export const groupProvisioning = async (service) => {
    const groups = getGoogleGroups(service)

    let filename = `google_groups_${dayjs().format(
        "DD-MM-YYYY_HH-mm"
    )}.json`;
    
    fs.writeFile(
        `generated/${filename}`,
        JSON.stringify(groups, null, 4),
        (err) => {
            if (err)
                return console.error(
                    chalk.redBright(
                        "The API returned an error:",
                        err.message
                    )
                );
            console.log(chalk.bgGreenBright("Finished!"));
            process.exit(0);
        }
    );
} 