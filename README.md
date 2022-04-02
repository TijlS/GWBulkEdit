# Google Workspace Bulk Edit

Project designed for GO! Atheneum Oudenaarde

## Setup
1) Create a project on Google Cloud and enable the 'Admin SDK API' 
    (https://developers.google.com/workspace/guides/create-project) 
2) Authorization credentials for a desktop application. 
    (https://developers.google.com/workspace/guides/create-credentials#desktop-app) 
3) Place the credentials.json in this folder
4) Make sure the Google Workspace domain has API access enabled 
    (https://support.google.com/a/answer/60757) 
5) Sign in with the Google Workspace administrator account

## Instructions
1) Run `npm install`
2) Make sure that the credentials.json is in this folder
3) Run `npm run start`
4) Open the link and sign in with the Google Workspace administator account
5) Enter the code that you got while signing in
6) Enter the domain name from wich you want to get the users
7) Enter the domain you want to transfer them to
    (jhon.doe@example.com => jhon.doe@new-domain.com)
8) Wait until the process finishes (This can take a bit of time!) 

© Tijl Schipper 2022