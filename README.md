# Personal Academic Website

This is the source code for my personal academic website, built with Hugo and the PaperMod theme.

## Setup

1. Install Hugo (extended version)
2. Clone this repository
3. Initialize and update the theme submodule:
   ```bash
   git submodule init
   git submodule update
   ```

## Local Development

To run the site locally:
```bash
hugo server -D
```

The site will be available at http://localhost:1313/

## Building

To build the site:
```bash
hugo
```

The built site will be in the `public` directory.

## Adding Content

- Create new pages in the `content` directory
- Add images to the `static` directory
- Modify the configuration in `hugo.toml`

## Theme

This site uses the [PaperMod](https://github.com/adityatelange/hugo-PaperMod) theme. 