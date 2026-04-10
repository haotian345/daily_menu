# Daily Menu - WeChat Mini Program

A WeChat mini program that helps you discover delicious recipes based on available ingredients and cookware.

## Features

- **Ingredient Selection** — 6 categories with 60+ preset ingredients, supports custom additions
- **Cookware Selection** — 10 preset cookware types, supports custom additions
- **Smart Matching** — Intelligently matches recipes based on selected ingredients and cookware, sorted by match rate
- **Recipe Details** — Complete ingredient lists, cooking steps, and tips
- **Custom Recipes** — Users can add, edit, and delete their own recipes
- **Random Recommendation** — Not sure what to cook? One-tap random suggestion
- **Cloud Database** — Built on WeChat Cloud Development with cloud data storage

## Project Structure

```
├── miniprogram/                # Mini program source code
│   ├── pages/
│   │   ├── index/             # Home - ingredient/cookware selection
│   │   ├── result/            # Search results page
│   │   ├── detail/            # Recipe detail page
│   │   ├── init/              # Database initialization page
│   │   ├── manage/            # Management center
│   │   ├── manage-ingredients/# Ingredient management
│   │   ├── manage-cookware/   # Cookware management
│   │   ├── add-recipe/        # Add/edit recipe
│   │   └── my-recipes/        # My recipes list
│   ├── components/
│   │   └── recipe-card/       # Recipe card component
│   ├── data/
│   │   ├── recipes.js         # Preset recipe data (60 recipes)
│   │   └── constants.js       # Shared constants
│   └── utils/
│       └── util.js            # Utility functions
├── cloudfunctions/             # Cloud functions
│   ├── getRecipes/            # Recipe search and query
│   └── initData/              # Data initialization
└── project.config.json        # Project configuration
```

## Cloud Database Collections

| Collection | Purpose | Permissions |
|-----------|---------|------------|
| `recipes` | Preset recipes | Readable by all users |
| `custom_ingredients` | User custom ingredients | Creator read/write only |
| `custom_cookware` | User custom cookware | Creator read/write only |
| `custom_recipes` | User custom recipes | Creator read/write only |

## Getting Started

### Prerequisites

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- A registered WeChat Mini Program account with Cloud Development enabled

### Installation

1. Clone the repository

```bash
git clone https://github.com/haotian345/daily_menu.git
```

2. Copy the example config files and fill in your own information

```bash
cp project.config.example.json project.config.json
cp project.private.config.example.json project.private.config.json
```

Then edit `project.config.json` and replace the `appid` with your own Mini Program AppID.

3. Open WeChat Developer Tools and import the project directory

4. Create the following collections in the Cloud Development console and set permissions:
   - `recipes` — Readable by all users
   - `custom_ingredients` — Creator read/write only
   - `custom_cookware` — Creator read/write only
   - `custom_recipes` — Creator read/write only

5. Deploy the `getRecipes` cloud function

6. On first run, the app will automatically import preset recipes into the cloud database. You can also manually visit the initialization page to complete the import.

## Tech Stack

- WeChat Mini Program Native Framework
- WeChat Cloud Development (Cloud Database + Cloud Functions)
- JavaScript (ES6+)

## License

MIT License
