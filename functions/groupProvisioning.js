import { admin_directory_v1 } from "googleapis"
import chalk from "chalk";

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getGoogleGroups = async (service) => {
    let res = [];
	const requestPages = async (options) => {
		try {
			const pageRes = await service.groups.list(options);
			res = [...res, ...pageRes.data.groups];
			if (pageRes.data.nextPageToken) {
				options.pageToken = pageRes.data.nextPageToken;
                options.domain = "leerling.go-atheneumoudenaarde.be"
				await requestPages(options);
			}
		} catch (err) {
			console.error(chalk.redBright(`An error occured: ${err}`));
			process.exit(0);
		}
	};

	await requestPages({
        domain: "leerling.go-atheneumoudenaarde.be"
    });

	return res;
}

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getUsersInGroup = async (service, groupKey, groupName) => {
    let res = [];
	const requestPages = async (options) => {
		try {
			const pageRes = await service.members.list(options)
            if(pageRes.data.members){
                res = [...res, ...pageRes.data.members];
                if (pageRes.data.nextPageToken) {
                    options.pageToken = pageRes.data.nextPageToken;
                    await requestPages(options);
                }
            }else{
                console.log(`${chalk.whiteBright.bgRedBright('EMPTY GROUP')}: ${groupName} is empty!`)
            }
		} catch (err) {
			console.error(chalk.redBright(`An error occured: ${err}`));
			process.exit(0);
		}
	};

	await requestPages({
        groupKey
    });

	return res;
}

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const getGroupsWithUsers = async (service) => {
    let res = [];

    const groups = await getGoogleGroups(service)

    for (const g of groups) {
        const users = await getUsersInGroup(service, g.id, g.name)
        res.push({
            groupName: g.name,
            groupEmail: g.email,
            groupEtag: g.etag,
            users: users.map(u => {
                return {
                    id: u.id,
                    email: u.email,
                    name: u.email.split('@')[0]
                }
            })
        })

    }

    return res
}

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const deleteEmptyGroups = async (service) => {
    const groups = await getGoogleGroups()

    groups.forEach(async g => {
        if(g.directMembersCount == 0){
            await service.groups.delete({
                groupKey: g.id
            })
        }
    })
}

/**
 *
 *  @param {admin_directory_v1.Admin} service An authorized OAuth2 client.
 */
export const groupProvisioning = async (service) => {
    const groupsWithUsers = await getGroupsWithUsers(service)

    console.log(chalk.bgGreenBright("Finished!"));
    process.exit(0);
}