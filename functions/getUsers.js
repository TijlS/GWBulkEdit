import chalk from "chalk";
import { admin_directory_v1 } from "googleapis"

/**
 *
 * @param {admin_directory_v1.Params$Resource$Users$List} query The searchQuery
 * @param {admin_directory_v1.Admin} service
 * @returns {Array} An array of users
 */
export const getUsers = async (query, service) => {

    let res = [];
    /**
     * 
     * @param {admin_directory_v1.Params$Resource$Users$List} options 
     */
    const requestPages = async (options) => {
        try {
            const pageRes = await service.users.list(options);
            res = [...res, ...pageRes.data.users];
            if (pageRes.data.nextPageToken) {
                options.pageToken = pageRes.data.nextPageToken;
                await requestPages(options);
            }
        } catch (err) {
            console.error(chalk.redBright(`An error occured: ${err}`));
            process.exit(0);
        }
    };

    console.time('fetch_google')
    console.log(`${chalk.gray.italic('Fetching all google users...')}`)
    await requestPages(query);
    console.log(`${chalk.gray.italic('Done!')}`)
    console.timeEnd('fetch_google')

    return res;
};