# Google Workspace Bulk Edit

## Introduction
This package can be used to bulk-update users of a Google Workspace.
Usefull links:
- [Setup](#setup-see-helpmd)
- [Instructions](#instructions)
- [Commands](#commands)

⚠️ This needs to be used inside it's own directory (eg. `~/GWBulkEdit`) ⚠️

## Setup (see [HELP.md](HELP.md))
1) run ` git clone https://github.com/TijlS/GWBulkEdit.git` to a folder
2) Run `npm install`
3) Create a project on Google Cloud and enable the 'Admin SDK API' 
    (https://developers.google.com/workspace/guides/create-project) 
4) Authorization credentials for a desktop application. 
    (https://developers.google.com/workspace/guides/create-credentials#desktop-app) 
    ([HELP.md](HELP.md))
5) Place the credentials.json in this folder
6) Make sure the Google Workspace domain has API access enabled 
    (https://support.google.com/a/answer/60757) 
7) Sign in with the Google Workspace administrator account

## Instructions
1) Make sure that the credentials.json is in this folder
2) Run `npm run start`
3) The app will open a browser window for signing in with your Google account
4) Log in using your Google Workspace Admin account
5) Follow the instructions in the terminal
6) ~~**⚠️ The standard command signs the users out after their account has been updated. See [commands](#commands) for more info**~~ Change reverted

## Commands
| Command                   | Description   |
|:--------------------------|:--------------|
|`npm run start`            | Run the program and sign the users out after an update |
|~~`npm run start:nosignout`~~  | ~~Run the program and don't sign the users out after an update~~ Command removed |
|`npm run start:signout`            | Sign the users out after their account has been updated |



### ⚠️ This is not tested on real data

© Tijl Schipper 2022