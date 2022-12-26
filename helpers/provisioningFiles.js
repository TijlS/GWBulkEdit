import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import fs from "fs";
import path from "path";
import { cwd } from "process";

dayjs.extend(customParseFormat);

const FILE_NAME_GROUPS = {
	smsc_users: ["users_SMSC"],
	smsc_classes: ["classes_SMSC"],
	google_users: ["users_GOOGLE"],
    combined_users: ['combined_users'],
	test: ["test_users"]
};

export const getProvisioningFiles = async (filter) => {
	let files = await fs.readdirSync(path.join(cwd(), "provisioning/"));
	files = files.map((file) => {
		const fileNameSplit = file.split("@");
		const timeCreated = dayjs(fileNameSplit[1], "DD-MM-YYYY_HH-mm");
		return {
			name: fileNameSplit[0],
			createdAt: timeCreated.unix(),
			originalFileName: file,
		};
	});

	if (filter) {
		files = files.filter((file) =>
			FILE_NAME_GROUPS[filter]?.includes(file.name)
		);
	}

	return files.sort((a, b) => a.createdAt - b.createdAt);
};

export const getLatestProvisioningFile = async (dataType) => {
	const files = await getProvisioningFiles(dataType);
	const latestFile = files[files.length - 1].originalFileName;

	const fileContents = fs.readFileSync(
		path.join(cwd(), `provisioning/${latestFile}`),
		"utf-8"
	);

	return {
		file: latestFile,
		content: JSON.parse(fileContents),
	};
};

export const updateProvisioningFile = async (fileName, content) => {
	fs.writeFileSync(
		path.join(cwd(), `provisioning/${fileName}`),
		JSON.stringify(content, null, 4)
	);
};


export const combineUserProvisioningFiles = async () => {
    let output = []

    const google_users = (await getLatestProvisioningFile('google_users')).content
    const smsc_users = (await getLatestProvisioningFile('smsc_users')).content
	const smsc_classes_with_users = (await getLatestProvisioningFile('smsc_classes')).content

    for (const user of smsc_users) {
        const google_user = google_users.filter(u => u.email.split('@')[0].toLowerCase() == user.username.toLowerCase());
		const officialClass = smsc_classes_with_users.find(c => c.users.some(u => u.internalId === user.internalId));
        output.push({
            name: user.username,
			officialClass: officialClass?.classCode,
            smartschool: user,
            google: google_user,
            custom: {
                photo_updated: false,
                class_updated: false
            }
        })
    }

    let filename = `combined_users@${dayjs().format("DD-MM-YYYY_HH-mm")}.json`;

    fs.writeFileSync(
		path.join(cwd(), `provisioning/${filename}`),
		JSON.stringify(output, null, 4)
	);
}