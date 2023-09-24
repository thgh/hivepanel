export const hiveConfig = {
  webserver: process.env.HIVE_WEBSERVER || 'traefik',
  rootDomain: process.env.HIVE_ROOT || 'local.thomasg.be',
}
