export const hiveConfig = {
  webserver: process.env.HIVE_WEBSERVER || 'traefik',
  rootDomain: process.env.HIVE_ROOT || 'local.thomasg.be',
}

// docker run --rm -i   -v /var/run/docker.sock:/var/run/docker.sock:ro -p 80:80 -p 24678:24678  thgh/hivepanel
