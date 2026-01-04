# Tracker

A simple daily tracking app built with SvelteKit and Supabase. Hosted on github pages.

## To-Do

- [ ] Add a way to add a new daily tracking entry
- [ ] Add a way to edit a daily tracking entry
- [ ] Add a way to delete a daily tracking entry
- [ ] Add a way to view a daily tracking entry
- [ ] Add authentication with github
- [ ] Single page input and statistics
- [ ] Page for viewing the whole database
- [ ] Dark mode
- [ ] Mobile friendly
- [ ] Chartjs or something that works with svelte

## Tips and tricks

### Setup

Create a new Svelte 5 proejct with the following command:

```sh
npx sv create my-app
```

Create a new repository in Github. Then import the project or add the git folder to the project folder.

### Supabase

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

### Github Pages

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

### Authentication

You can find information about authentication with Supabase and SvelteKit in this [guide](https://supabase.com/docs/guides/auth/social-login/auth-github?queryGroups=environment&environment=client&queryGroups=framework&framework=sveltekit&queryGroups=language&language=js).
