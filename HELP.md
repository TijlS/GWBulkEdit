# Google Workspace Bulk Edit Help

[🔙 Back](README.md)

## Steps for setup
#### 1) ![Step 1](help/step1.png?raw=true)

    Create/Select a project in [Google Cloud Console](//console.cloud.google.com)
#### 2) ![Step 2](help/step2.png?raw=true)

    In the menu, select *Enable APIs & services* under *APIs & Services*
#### 3) ![Step 3](help/step3.png?raw=true)

    Click on *Enable APIs & services*
#### 4) ![Step 4](help/step4.png?raw=true)

    Search for *Admin SDK* and select the first result
#### 5) ![Step 5](help/step5.png?raw=true)

    Click on *Enable*
#### 6) ![Step 6](help/step6.png?raw=true)

    In the top right corner, click on *Create credentials*
#### 7) ![Step 7](help/step7.png?raw=true)

    Select *User data*
#### 8) ![Step 8](help/step8.png?raw=true)

    Enter the details for the credentials
#### 9) ![Step 9](help/step9.png?raw=true)

    Click on *Add or remove scopes* and search for *admin.directory.user*. Tick the box next to *../auth/admin.directory.user*. Save the scopes

### ❗ This is an important step
#### 10) ![Step 10](help/step10.png?raw=true)

    Give the client a name and select ***Desktop app***
#### 11) ![Step 11](help/step11.png?raw=true)

    Download the credentials and place the file in this folder. Make sure the file is named ***credentials.json***

### ➕ Optional
#### 12) ![Step 12](help/step12.png?raw=true)

    In OAuth Consent screen, make the app internal