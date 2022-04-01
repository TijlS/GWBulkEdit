# Google Workspace Bulk Edit

Project designed for GO! Atheneum Oudenaarde

## Setup
1) Create a project on Google Cloud and enable the 'Admin SDK API' 
    (https://developers.google.com/workspace/guides/create-project) 
2) Authorization credentials for a desktop application. 
    (https://developers.google.com/workspace/guides/create-credentials) 
3) Place the credentials.json in this folder
4) Make sure the Google Workspace domain has API access enabled 
    (https://support.google.com/a/answer/60757) 
5) Sign in with the Google Workspace administrator account

## Instructions
1) Run `npm install`
2) Make sure that the credentials.json is in this folder
3) Open the link and sign in with the Google Workspace administator account
4) Enter the code that you got wile signing in
5) Enter the domain name from wich you want to get the users
6) Enter the domain you want to transfer them to
    (jhon.doe@example.com => jhon.doe@new-domain.com)
7) Wait until the process finishes (This can take a long time!) 

© Tijl Schipper 2022