import chalk from "chalk";

/**
 * 
 * @param {Object} query The searchQuery
 * @param {google.admin} service 
 * @returns {Array} An array of users
 */
export const getUsers = async (query, service) => {
    let result = []
    let nextPageToken = "START";

    while (nextPageToken !== null) {
        if(nextPageToken !== "START"){
            query.pageToken = nextPageToken
        }
        let res;
        try {
            res = await service.users.list(query)
        } catch (error) {
            console.error(
                chalk.redBright(`An error occured: ${error}`)
            )
            process.exit(0)
        }
        const users = res.data.users
        result.push(users)
        nextPageToken = res.data.nextPageToken !== "" ? res.data.nextPageToken : null
    }

    return result
}