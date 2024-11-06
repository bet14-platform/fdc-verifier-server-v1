
# Bet14 Verifier Server

This repository contains verifier server for match results data from The Odds API (orignally forked from Olympics Prediction Showcase).

Match results are verified against the data from The Odds API via paid API access.

### Attestation Type Details

The project provides its own attestation type, the `Match result` attestation type. This attestation type defines how data can be verified by the attestation providers. To identify the match, the following parameters must be used:

- date: match date (Unix timestamp without hour, rounded down to the day)
- sport: match sport (enum Sports)
- teams: match teams

This attestation is specific to one event (Olympic games) but can be easily extended to other team sports.

#### List of Sports

- Football (EPL) = 0
- Baseball (MLB) = 1

### Verifier Server

A verifier server is implemented for the defined `Match result` attestation type. The logic for the verifier server is written in TypeScript and is not included in this repository. The verifier server provides the logic for obtaining data from the WEB2 world.

For this attestation type, the verifier server calls an API provided by The Odds API, which returns the match results. If the data aligns with the expected results, it is considered valid. The verifier server is used by the attestation provider.

By default, there are whitelisted IPs, which are allowed to access the API. This is useful to prevent abuse of the API. By default, the local IP addresses `127.0.0.1`, `::1`, `::ffff:127.0.0.1` are whitelisted. To add more IP addresses to the whitelist, set the `IP_WHITELIST` environment variable to a comma-separated list of IP addresses.

## Installation

```bash
yarn
```

## Running the app

```bash
# Use the default env 
cp .env.example .env
# Or configure your by editing the .env file

# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

With the above provided `.env` config file the web server with Swagger can be tested at `http://localhost:4500/api`. Use the `Authorize` button on Swagger interface to provide one of the API keys for authentication.

## Test

```bash
# unit tests
$ yarn test

# e2e tests
$ yarn test:e2e

# test coverage
$ yarn test:cov
```


## Using the pre-built docker image (NOT DEPLOYED YET)

Pull the docker image:
```
docker pull bet14/verifier-server 
```

Start the docker image with your environment variables:
```
docker run --name verifier-server -e PORT=4500 -e API_KEYS=API_KEY_1,API_KEY_2,API_KEY_3 -e THE_ODDS_API_KEY=API_KEY_4 -p 4500:4500 -d bet14/verifier-server
```

## License

This project is [MIT licensed](LICENSE.md).
