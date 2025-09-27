# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d50e12b5-8df8-4c0c-a24b-c1a69cb79a1d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d50e12b5-8df8-4c0c-a24b-c1a69cb79a1d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Bias tracking & Supabase setup

Bias tracking in the trading dashboard depends on Supabase tables, views, and RPC functions that ship with this
repository. If you open the app and see a yellow banner that reads “Bias tracking configuration missing – Bias state
storage is not available. Please run the latest Supabase migrations to enable bias tracking.” it simply means those
Supabase migrations have not been applied yet.

To fix the warning:

1. Install the [Supabase CLI](https://supabase.com/docs/reference/cli/usage) (once per machine).
2. Start your local Supabase stack or link a remote project: `supabase start`
3. Apply the bundled migrations: `supabase db reset`
4. Refresh the dashboard – the warning disappears once the schema exists.

More detail lives in [`docs/troubleshooting/bias-tracking.md`](docs/troubleshooting/bias-tracking.md).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d50e12b5-8df8-4c0c-a24b-c1a69cb79a1d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
