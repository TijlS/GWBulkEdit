# Google Workspace Bulk Edit

Project designed for GO! Atheneum Oudenaarde

## Setup (see [HELP.md](HELP.md))
1) run ` git clone https://github.com/TijlS/GWBulkEdit.git `
2) Run `npm install`
3) Create a project on Google Cloud and enable the 'Admin SDK API' 
    (https://developers.google.com/workspace/guides/create-project) 
4) Authorization credentials for a desktop application. 
    (https://developers.google.com/workspace/guides/create-credentials#desktop-app) 
5) Place the credentials.json in this folder
6) Make sure the Google Workspace domain has API access enabled 
    (https://support.google.com/a/answer/60757) 
7) Sign in with the Google Workspace administrator account

## Instructions
1) Make sure that the credentials.json is in this folder
2) Run `npm run start`
3) Open the link and sign in with the Google Workspace administator account
4) Enter the code that you got while signing in
5) Follow the instructions in the terminal
6) Wait until the process finishes (This can take a bit of time!) 

### ⚠️ This is not tested on real data

© Tijl Schipper 2022