# Getting started

Follow these steps to deploy the application in your hosted environment.

## 1. Use Docker Compose

A [`docker-compose.yml`](./docker-compose.yml) file is provided at the root of this repository. Use this file to run the container.

## 2. Prepare your `.env` and data files

The application requires a `.env` file for configuration, and also requires an empty database file present before startup.

**You must manually create these files before starting the container:**

- Create an empty `.env` file in your data directory.  
  If you want to start with the example configuration, copy it from the .env.example file in the repository.
  If the file is empty, the application will create a default configuration from the example file.

- Create an empty database.sqlite file in your data directory.

## 3. Deploy the application

Start the application using Docker Compose:

```
docker compose up -d
```

The application will be available on port **80**, or on the port you have configured in your `docker-compose.yml`.

> If you configured a different port, use that port to access the application.

---

Your application should now be running in your environment.
