import winston from "winston"
import { join } from "path"
import { cwd } from "process"
import fs from "fs"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"

export const configureLogger = () => {
    dayjs.extend(customParseFormat)
    
    const { format } = winston
    const { combine, timestamp, simple } = format
    
    winston.loggers.add('logger', {
        format: combine(
            timestamp(),
            simple()
        ),
        transports: [
            new winston.transports.File({ filename: join(cwd(), `logs/${dayjs().format("DD-MM-YYYY_HH-mm")}.log`) }),
            new winston.transports.Console()
        ]
    })
}


export const latestLogFile = async () => {
    let files = await fs.readdirSync(join(cwd(), "logs/"));
	files = files.map((file) => {
		const timeCreated = dayjs(file, "DD-MM-YYYY_HH-mm");
		return {
			createdAt: timeCreated.unix(),
			originalFileName: file,
		};
	});

	const latestFile = files.sort((a, b) => b.createdAt - a.createdAt)[0]

    const fileContents = fs.readFileSync(
		join(cwd(), `logs/${latestFile.originalFileName}`),
		"base64"
	);

    return {
        filedata: fileContents,
        filename: latestFile.originalFileName
    }
}