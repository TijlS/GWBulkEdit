# Google Workspace Bulk Edit Help

[🔙 Back](README.md)

## Steps for setup
#### 1. ![Step 1](public/images/setup/step1.png?raw=true)
Create/Select a project in [Google Cloud Console](//console.cloud.google.com)

#### 2. ![Step 2](public/images/setup/step2.png?raw=true)
In the menu, select *Enable APIs & services* under *APIs & Services*

#### 3. ![Step 3](public/images/setup/step3.png?raw=true)
Click on *Enable APIs & services*

#### 4. ![Step 4](public/images/setup/step4.png?raw=true)
Search for *Admin SDK* and select the first result

#### 5. ![Step 5](public/images/setup/step5.png?raw=true)
Click on *Enable*

#### 6. ![Step 6](public/images/setup/step6.png?raw=true)
In the top right corner, click on *Create credentials*

#### 7. ![Step 7](public/images/setup/step7.png?raw=true)
Select *User data*

#### 8. ![Step 8](public/images/setup/step8.png?raw=true)
Enter the details for the app

#### 9. ![Step 9](public/images/setup/step9.png?raw=true)
### ❗ This is an important step
Click on *Add or remove scopes* and search for *admin.directory.user*. Tick the box next to the folliwing scopes:

> - `../auth/admin.directory.user`
> - `../auth/admin.directory.user.alias`
> - `../auth/admin.directory.group`
> - `../auth/admin.directory.group.member`
> - `../auth/admin.directory.orgunit`
> - `../auth/admin.directory.userschema`
> - `../auth/admin.directory.domain.readonly`


#### 10. ![Step 10](public/images/setup/step10.png?raw=true)
Give the client a name and select ***Desktop app***

#### 11. ![Step 11](public/images/setup/step11.png?raw=true)
Download the credentials and place the file in the `config/`.
> Make sure the file is named ***credentials.json***, otherwise the app will **not** recognise it 

#### 12. ![Step 12](public/images/setup/step12.png?raw=true)
In OAuth Consent screen, under Test users, click on add users

#### 13. ![Step 13](public/images/setup/step13.png?raw=true)
Enter the emailaddress of your admin account.
> Only this account will be able to use the app. Make sure you don't make a typo!