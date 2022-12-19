import chalk from "chalk";

/**
 *
 * @param {Object} query The searchQuery
 * @param {google.admin} service
 * @returns {Array} An array of users
 */
export const getUsers = async (query, service) => {
    
	let res = [];
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

	await requestPages(query);

	return res;
};
