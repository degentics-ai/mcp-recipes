# MCP Recipes Server

A server that exposes tools to query recipes using the Model Context Protocol (MCP).

## Features

- Query recipes by name, ingredients, cuisine, or ID

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-recipes

# Install dependencies
yarn install
```

## Usage

### Starting the server

```bash
# Development mode
yarn dev

# Production mode
yarn build
yarn start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

### Running the client example

```bash
# Make sure the server is running in another terminal
yarn client
```

## License

MIT
