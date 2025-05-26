# Getting Started (Hosted Environments)

Follow these steps to deploy the application in your hosted environment.

## 1. Use Docker Compose

A [`docker-compose.yml`](./docker-compose.yml) file is provided at the root of this repository. Use this file to orchestrate and run all required services.

## 2. Prepare Your `.env` File

The application requires a `.env` file for configuration. This file is mounted into the container via Docker Compose.

- If you do **not** have an existing `.env`, the container will automatically create one from `.env.example` and run `php artisan key:generate` on first startup.
- If you want to customize configuration **before** the container starts, copy the example to your host directory and edit as needed:

```bash
cp .env.example /path/to/gim/data/.env
```

Replace `/path/to/gim/data/` with your actual host data directory.

- If you want to let the entrypoint initialize the `.env` (including setting the app key), you can edit the `.env` **after** the first container startup. The application will use your changes on subsequent runs.

## 3. Deploy the Application

Start the application using Docker Compose:

```bash
docker compose up -d
```

The application will be available on port **80**, or on the port you have configured in your `docker-compose.yml`.

> If you configured a different port, use that port to access the application.

---

Your application should now be running in your environment using your configured `.env` file.  
You can update environment variables by editing the mounted `.env` file and restarting the container for changes to take effect.
