# Unleaded cli

This is an interactive cli to search car listings.

```bash
AUTO_DEV_API_KEY=xxx npx tsx main.tsx -z <zip> [-b <brand>] [-m <model>] [-d <distance>] [-e <engine>]
```

Options:

- `-z, --zip` - Zip code for search location (required)
- `-b, --brand` - Brand/make name (e.g., Hyundai, Tesla)
- `-m, --model` - Model name (e.g., Ioniq 5, Model 3)
- `-d, --distance` - Search radius in miles (default: 50)
- `-e, --engine` - Engine type (default: electric)

Use `--wizard` for interactive mode or `--help` for full usage info.

# Requirements

Using `api.auto.dev` API, register an account and get API key to use with this cli.

auto.dev provides enough free searches per month to find a good deal.

To start, run `yarn install`

# How to use

Unleaded cli provides market snapshot.

![](./media/controls.png)

It loads vehicle listings for a car maker, zip and desired distance. Use fast cli to sort and filter listing to find cars in the desired price range and location.

If something looks good, click on carfax link to check the history. There is also a link to Google search for Vin number. Google usually points to the dealership listing on first result or second result.

Call sales and negotiate :)

# Build

To make it start faster:

`npx projen build`

`AUTO_DEV_API_KEY=hey node lib/src/main.js`

# Features

Caches all content in ./cache dir to re-use data.

Interactive, instant sorting by various parameters (price, cpo flag etc). Basic search to find dealer names.

Filter by model name, and CPO (manufacturer certified pre-owned) state.

Clicable links to the car image, carfax report and vin search through Google

Normalizes model names

![link](./media/unleaded.gif)

# Tech stack

Created with [Effect](http://effect.website) for declarative coding, [ink](https://github.com/vadimdemedes/ink) for terminal UI, [Effect Atom](https://github.com/tim-smart/effect-atom/blob/main/README.md) for the state, [Projen](https://github.com/projen/projen) for the project and deps management, and the usual AI involment.

# Contributions

Hack away on it with your fav agent :)
