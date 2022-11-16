import chalk from "chalk";
import express from "express";
import path from "path";
import Database from "better-sqlite3";

const db = new Database(path.join(process.cwd(), "/config/database.db"));
const app = express();

//#region Fn
const getTables = () => {
	const tables = db
		.prepare("SELECT * FROM sqlite_master WHERE type = ?")
		.all("table");
	return tables;
};

const getColumnNames = (table) => {
	const colums = db.pragma(`table_info('${table}')`);
	return colums;
};
const getData = (table) => {
	const data = db.prepare(`SELECT * FROM ${table}`).all();
	return data;
};
//#endregion

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "/dbViewer/views"));
app.use(express.static(path.join(process.cwd(), "/dbViewer/assets")));

app.get("/", (req, res) => {
	res.render("index", {
		tables: getTables(),
	});
});

app.get("/viewer/:table", (req, res) => {
	res.render("viewer", {
		current_table: req.params.table,
		columns: getColumnNames(req.params.table),
        data: getData(req.params.table)
	});
});

export const startDbViewer = () => {
	app.listen(3000, () => {
		console.log(`${chalk.greenBright("Success")}, visit the DBviewer at
${chalk.italic("http://127.0.0.1:3000")}
${chalk.grey.italic("(to exit, press Ctr+C)")}`);
	});
};
