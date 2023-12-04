# PREreview COAR Notify

The source code for PREreview’s [COAR Notify] integration.

## Development

<details>

<summary>Requirements</summary>

- [Docker]
- [Docker Compose]
- [GNU Make]
- [Node.js]
- Unix-like operating system

</details>

### Running the app

To build and run the app for development, execute:

```shell
make start
```

You can now access the app at <https://localhost:3000>.

You will also have a `.env` file. This file contains environment variables controlling specific behaviours, including credentials for accessing external services.

## Operations

Once it passes CI, we deploy every commit on the `main` branch, which [Fly.io] hosts.

[coar notify]: https://www.coar-repositories.org/notify/
[docker]: https://www.docker.com/
[docker compose]: https://docs.docker.com/compose/
[fly.io]: https://fly.io/
[gnu make]: https://www.gnu.org/software/make/
[node.js]: https://nodejs.org/
