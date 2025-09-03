# Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication for your Data Safai Next.js application.

## Prerequisites

- Node.js 18+ installed
- A Clerk account (sign up at [clerk.com](https://clerk.com))

## Step 1: Install Dependencies

The Clerk package has already been installed:

```bash
npm install @clerk/nextjs
```

## Step 2: Set Up Clerk Dashboard

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application or select an existing one
3. Note down your **Publishable Key** and **Secret Key**

## Step 3: Environment Variables

1. Copy `env.example` to `.env.local`
2. Fill in your Clerk keys:

```bash
# Copy the example file
cp env.example .env.local

# Edit .env.local with your actual keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
```

## Step 4: Configure Clerk Application

In your Clerk dashboard:

1. **Authentication Methods**: Enable the methods you want (Email/Password, Google, GitHub, etc.)
2. **Redirect URLs**: Add your domain URLs
3. **Webhooks** (optional): Set up webhook endpoint for user events

## Step 5: Test the Application

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/sign-in` or `/sign-up` to test authentication
3. Try accessing `/dashboard` (should redirect to sign-in if not authenticated)

## Features Implemented

### ✅ Authentication Pages
- **Sign In**: `/sign-in` - Uses Clerk's SignIn component
- **Sign Up**: `/sign-up` - Uses Clerk's SignUp component
- **Dashboard**: `/dashboard` - Protected route requiring authentication

### ✅ API Routes
- **Webhook**: `/api/auth/[...nextauth]/route.ts` - Handles Clerk webhooks
- **User Info**: `/api/user/route.ts` - Protected API route for user data

### ✅ Components
- **Navbar**: Shows authentication state and user info
- **UserButton**: Clerk's user management component
- **SignInButton**: Modal sign-in trigger

### ✅ Middleware
- **Route Protection**: Automatically protects routes based on authentication
- **Public Routes**: Homepage, sign-in, and sign-up remain public

## Customization

### Styling Clerk Components

The Clerk components are styled to match your app's theme using the `appearance` prop:

```tsx
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
      card: "bg-transparent shadow-none",
      // ... more styling options
    }
  }}
/>
```

### Adding More Protected Routes

To protect additional routes, add them to the middleware configuration in `middleware.ts`:

```ts
export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in", 
    "/sign-up",
    "/api/auth/(.*)",
  ],
  // All other routes will be protected
});
```

### User Data

Access user information in any component:

```tsx
import { useUser } from "@clerk/nextjs";

function MyComponent() {
  const { user, isSignedIn } = useUser();
  
  if (isSignedIn) {
    console.log(user.emailAddresses[0].emailAddress);
    console.log(user.firstName);
  }
}
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@clerk/nextjs'"**
   - Run `npm install @clerk/nextjs` again
   - Restart your development server

2. **Authentication not working**
   - Check your environment variables are correct
   - Verify Clerk dashboard configuration
   - Check browser console for errors

3. **Styling issues**
   - Ensure your CSS variables are properly defined
   - Check the `appearance` prop configuration

### Getting Help

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord](https://discord.gg/clerk)
- [Next.js Documentation](https://nextjs.org/docs)

## Security Notes

- Never commit your `.env.local` file
- Keep your Clerk secret key secure
- Use environment variables for all sensitive configuration
- Regularly rotate your API keys

## Next Steps

After setting up authentication, consider adding:

1. **User Profiles**: Custom user data and preferences
2. **Role-Based Access**: Different permissions for different user types
3. **Email Verification**: Require email confirmation
4. **Two-Factor Authentication**: Enhanced security
5. **Social Login**: Google, GitHub, etc.
6. **User Management**: Admin panel for user management 