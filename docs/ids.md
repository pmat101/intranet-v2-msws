App name- swa-perfact-intranet
subscription ID [e0b665de-b85f-49ae-b9b7-0f83253c0445]
URL [https://delightful-hill-04d74c200.7.azurestaticapps.net]
Entra app client ID [62acdb32-484e-47ca-9e3a-0b58359edbb5]
Application (client) ID [a0640e62-6b90-4c4b-999c-0ed595a6b4c8]
Directory (tenant) ID [62acdb32-484e-47ca-9e3a-0b58359edbb5]
Supported account types- my organisation only
| SharePoint host | perfactgroup933.sharepoint.com |
| Development site URL | https://perfactgroup933.sharepoint.com/sites/bd-pipeline-dev |,
| SharePoint host | perfactgroup933.sharepoint.com |
| Development site URL | https://perfactgroup933.sharepoint.com/sites/bd-pipeline-dev |

GET Request on Graph Explorer:
{
"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#sites/$entity",
"@microsoft.graph.tips": "Use $select to choose only the properties your app needs, as this can lead to performance improvements. For example: GET sites('<key>')/microsoft.graph.getByPath(path=<key>)?$select=displayName,error",
"createdDateTime": "2026-08-21T01:09:29.87Z",
"description": "",
"id": "perfactgroup933.sharepoint.com,989aee89-20bc-4be5-9d30-10ed63b1c2a8,a1b7a325-78af-4b81-b43a-abbe461d535e",
"lastModifiedDateTime": "2026-08-23T00:22:10Z",
"name": "bd-pipeline-dev",
"webUrl": "https://perfactgroup933.sharepoint.com/sites/bd-pipeline-dev",
"displayName": "Perfact BD Pipeline (Dev)",
"root": {},
"siteCollection": {
"hostname": "perfactgroup933.sharepoint.com"
}
}

POST request:
{
"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#sites('perfactgroup933.sharepoint.com%2C989aee89-20bc-4be5-9d30-10ed63b1c2a8%2Ca1b7a325-78af-4b81-b43a-abbe461d535e')/lists/$entity",
"@odata.etag": "17f56c0a-b7c6-4ccd-81f2-d10317d13b04,4",
"eTag": "17f56c0a-b7c6-4ccd-81f2-d10317d13b04,4",
"lastModifiedDateTime": "2026-08-23T21:39:51Z",
"createdDateTime": "2026-08-23T21:39:51Z",
"description": "",
"id": "17f56c0a-b7c6-4ccd-81f2-d10317d13b04",
"name": "ZZTest",
"webUrl": "https://perfactgroup933.sharepoint.com/sites/bd-pipeline-dev/Lists/ZZTest",
"displayName": "ZZTest",
"createdBy": {
"user": {
"displayName": "Pranav Mathur TL/ UPSTREAM/ DEL/ HO/ PERFACT",
"email": "pranav.mathur@perfactgroup.in"
}
},
"parentReference": {
"siteId": "perfactgroup933.sharepoint.com,989aee89-20bc-4be5-9d30-10ed63b1c2a8,a1b7a325-78af-4b81-b43a-abbe461d535e"
},
"list": {
"contentTypesEnabled": false,
"hidden": false,
"template": "genericList"
}
}
