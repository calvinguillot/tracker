# Tracker

A simple daily tracking app built with SvelteKit and Supabase. Hosted on github pages.

## Dataviz Features

- Able to enable and disable columns
- Tooltips for desktop only
- Add a way to filter the data(date range)
- Distribution chart for average day
- Chart for amount of activities in the year
- Line chart tracking mood, energy, physical, sleep, meals, weight

## Setup

Create a new Svelte 5 proejct with the following command:

```sh
npx sv create my-app
```

Create a new repository in Github. Then import the project or add the git folder to the project folder.

## Supabase

More information about using Supabase with SvelteKit can be found in this [guide](https://supabase.com/docs/guides/getting-started/quickstarts/sveltekit).

You can use the following policy to get the daily tracking entries:

```sql
CREATE POLICY "public_select_all" ON public."dailyTracking" FOR SELECT TO PUBLIC USING (true);
```

Remember to add the .env file to the root folder.

```env
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

In the supabaseclient.js file, you can use the following code read the .env file:

```js
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
```

Remember to add the database schema to the root directory and gitignore it.

## Github Pages

For github pages use the following command:

```sh
npm install gh-pages --save-dev
```

From this [repo](https://github.com/stroblp/svelte-gh-pages)

Remember to add the file +layout.js to the routes folder and add the following code:

```js
export const prerender = true;
```

This will tell the app to prerender the pages.

Add the .nojekyll file to the root folder.

in the package.json file, add the following script:

```json
"deploy": "npm run build && npx gh-pages -d build -t",
```

This will build the app and deploy it to github pages.

## Capacitor

This project uses [Capacitor](https://capacitorjs.com/) to run the web app as a native Android (and optionally iOS) app. The web build output is in `build` (see `capacitor.config.ts`).

**Initial setup** (if starting from scratch):

```sh
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android
npx cap add android
```

**Build and run on device/emulator:**

```sh
npm run build
npx cap sync
npx cap open android
```

- `npx cap sync` copies the built web app into the native project and updates native dependencies.
- `npx cap open android` opens the Android project in Android Studio so you can run or debug on a device or emulator.

For iOS (macOS only):

```sh
npm install @capacitor/ios
npx cap add ios
npx cap open ios
```

### Mobile Assets (Icons & Splash Screens)

We use `@capacitor/assets` to automatically generate icons and splash screens for Android and iOS.

1. **Place your source images** in the `assets/` folder in the project root:
   - `assets/icon.png` (Recommended size: 1024x1024 px, no transparency for iOS)
   - `assets/splash.png` (Recommended size: 2732x2732 px)
   - `assets/splash-dark.png` (Optional: for dark mode splash screen)

2. **Generate the assets**:
   ```sh
   npx capacitor-assets generate --android
   ```
   (Or use `npx capacitor-assets generate` if you have iOS configured as well).

3. **Sync changes**:
   Always copy the changes to the native platforms after generating:
   ```sh
   npx cap sync
   ```

## Authentication

You can find information about authentication with Supabase and SvelteKit in this [guide](https://supabase.com/docs/guides/auth/social-login/auth-github?queryGroups=environment&environment=client&queryGroups=framework&framework=sveltekit&queryGroups=language&language=js).
