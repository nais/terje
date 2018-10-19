export const creds = {
    redirectUrl: 'http://terje',
    appId: process.env['AZURE_AD_SERVICE_PRINCIPAL_APP_ID'],
    clientSecret: process.env['AZURE_AD_SERVICE_PRINCIPAL_PASSWORD'],
    tenantId: process.env['AZURE_AD_SERVICE_PRINCIPAL_TENANT'],
    scope: ["Group.Read.All"]
}