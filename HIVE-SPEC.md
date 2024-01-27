# 📦 Hive spec

## Service labels

This specification describes how service labels should be interpreted.

### hive.deploy.\*

Only one hive.deploy option should be used. If multiple options are set, the first one is considered active.

If none are set, the service should use the `Spec.ContainerSpec.Image` property.

If a new service is created without this label, it should use a fallback image. The fallback image should be lightweight, host a static site on port 80.

### hive.deploy.Dockerfile

The value of this label must contain a Dockerfile. If the value is not a valid Dockerfile, the service should fall back to the fallback image.

A redeploy of this deployment must first build a new image and use the latest image for the next service spec.

### hive.deploy.image

The value of this label must contain an image name. If the value is not a valid image name, the service should fall back to the fallback image.

A redeploy of this deployment must first pull this image and only then update the service.

### hive.deploy.static

The value of this label must contain a docker volume name OR a host path. If the value starts with `/` it is considered a host path. Otherwise it is considered a volume name. If the value is not a valid name/path respectively, the service should fall back to the fallback image.

A redeploy of this deployment should be a noop.

### hive.port

This label can be used to set the container port that should be exposed. If the value is not a valid port, it should be ignored and the default port: 80 should be used.

### hive.caddy

This label indicates that the service should be exposed using Caddy. If the value is `auto`, the service should automatically configure Caddy on every service update. If the value is `custom`, caddy should not be configured automatically.

Any other value should be ignored and means that the default reverse proxy should be used.

### hive.replicas

This label can be used to remember the desired number of replicas for a service that is paused. It should not be interpreted on service update. It should be used when unpausing a service. It should correspond with `Spec.Mode.Replicated.Replicas`.

### hive.hostnames

This label assigns one or more hostnames to a service. The router will use this information to configure virtual hosts. If empty, the service should not be considered a web service. Hostnames are separates by a comma, newline or semicolon.

### hive.web.https

If the value is `redirect`: it should redirect http traffic to https
If the value is `hsts`: it should redirect http traffic to https and set the HSTS header
If the value is `only`: it should only route https traffic

### hive.web.http

If the value is `redirect`: it should redirect https traffic to http
If the value is `only`: it should only route http traffic

### hive.tint

If the value is number between 0 and 360, it should be used as the background hue for the service. If the value is not a number between 0 and 360, it should be ignored.

### hive.user.\*

This label enables authentication for a service. The value must be a hashed password. It's recommended to set this label on the hivepanel service.

### hive.auth

If the value is `service-label`, the responsibility for authentication is moved from the webserver to the service. It means that service will read the `hive.user.*` labels for authenticatino purposes. This label allows the Hivepanel container to present a nice sign in screen instead of Basic Auth flow.

<!-- curl -sSL https://get.docker.com | sh

docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock:ro -p 23077:80 thgh/hivepanel -->
