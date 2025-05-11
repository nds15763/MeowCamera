# Supabase Integration with Expo

This document provides guidance on how to set up and use Supabase authentication in this Expo application.

## Setup Instructions

### 1. Create a Supabase Project

1. Sign up or log in to [Supabase](https://supabase.com)
2. Create a new project
3. Once your project is created, go to Project Settings > API to find your:
   - Project URL
   - Project anon/public key

### 2. Configure Your Application

Update the `/lib/supabase.ts` file with your Supabase credentials:

```typescript
// Replace with your Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'; // e.g., https://xyzproject.supabase.co
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // anon/public key
```

### 3. Configure Authentication

In your Supabase dashboard:

1. Go to Authentication > Providers
2. Ensure Email provider is enabled
3. Configure any additional providers if needed

## Features

This integration includes:

- User registration and login with email/password
- Authentication state management across app restart
- Protected routes based on authentication status
- Profile page showing user info and logout option

## Project Structure

- `/lib/supabase.ts` - Supabase client configuration
- `/contexts/auth.tsx` - Authentication context provider
- `/app/auth/` - Authentication screens (login, register)
- `/app/(tabs)/profile.tsx` - User profile page

## Testing Authentication

To test the authentication flow:

1. Register a new account with email and password
2. Verify your email if email verification is enabled in Supabase
3. Log in with your credentials
4. You should be directed to the home screen
5. Access your profile in the Profile tab
6. Test logging out

## Troubleshooting

- If you encounter connection issues, verify your Supabase URL and anon key
- Check your Supabase project's Authentication settings for email verification settings
- Monitor your Supabase logs for any authentication errors
