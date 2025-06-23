import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserRequest {
  email: string;
  password: string;
  userData: {
    full_name: string;
    email: string;
    phone?: string | null;
    department?: string | null;
    role: string;
    manager_id?: string | null;
    date_naissance?: string | null;
    fiche_poste?: string | null;
    is_active: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${requestId}] === CREATE USER FUNCTION START ===`)
  console.log(`[${requestId}] Method: ${req.method}`)
  console.log(`[${requestId}] URL: ${req.url}`)

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error(`[${requestId}] Missing environment variables`);
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          requestId 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const supabaseClient = createClient(supabaseUrl, anonKey)

    // Get and validate authorization header
    const authHeader = req.headers.get('Authorization')
    console.log(`[${requestId}] Auth header present: ${!!authHeader}`)
    
    if (!authHeader) {
      console.log(`[${requestId}] ERROR: No authorization header`)
      return new Response(
        JSON.stringify({ 
          error: 'Authorization required',
          requestId 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user authentication and permissions
    const token = authHeader.replace('Bearer ', '')
    console.log(`[${requestId}] Token length: ${token.length}`)
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    console.log(`[${requestId}] Auth user: ${user?.id}, Error: ${authError?.message}`)

    if (authError || !user) {
      console.log(`[${requestId}] ERROR: Invalid authentication - ${authError?.message}`)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication',
          details: authError?.message,
          requestId 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check user permissions
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log(`[${requestId}] User profile: ${JSON.stringify(profile)}, Error: ${profileError?.message}`)

    if (profileError || !profile || !['direction', 'admin'].includes(profile.role)) {
      console.log(`[${requestId}] ERROR: Insufficient permissions - Role: ${profile?.role}`)
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions',
          required: 'direction or admin',
          current: profile?.role || 'none',
          requestId 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse and validate request body
    const requestBody = await req.text()
    console.log(`[${requestId}] Request body length: ${requestBody.length}`)
    
    let parsedBody: CreateUserRequest
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.log(`[${requestId}] ERROR: Invalid JSON - ${parseError.message}`)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, password, userData } = parsedBody
    console.log(`[${requestId}] Parsed data - Email: ${email}, Password length: ${password?.length}, UserData keys: ${Object.keys(userData || {})}`)

    // Validate required fields
    if (!email || !password || !userData) {
      console.log(`[${requestId}] ERROR: Missing required fields`)
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          received: {
            email: !!email,
            password: !!password,
            userData: !!userData
          },
          requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log(`[${requestId}] ERROR: Invalid email format`)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format',
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      console.log(`[${requestId}] ERROR: Password too short`)
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 6 characters long',
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required user data fields
    if (!userData.full_name || !userData.role) {
      console.log(`[${requestId}] ERROR: Missing required user data fields`)
      return new Response(
        JSON.stringify({ 
          error: 'Missing required user data fields (full_name, role)',
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already exists
    console.log(`[${requestId}] Checking for existing user...`)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (userExists) {
      console.log(`[${requestId}] ERROR: User already exists`)
      return new Response(
        JSON.stringify({ 
          error: 'A user with this email already exists',
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${requestId}] Creating auth user...`)
    
    // Create the user using admin client
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        created_by: user.id,
        created_at: new Date().toISOString()
      }
    })

    console.log(`[${requestId}] Auth user creation result: ${authData?.user?.id}, Error: ${createError?.message}`)

    if (createError) {
      console.log(`[${requestId}] ERROR: Failed to create auth user - ${createError.message}`)
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to create authentication user';
      let errorDetails = createError.message;
      
      // Check for common error patterns
      if (createError.message === 'Database error creating new user' || 
          createError.message.includes('duplicate') || 
          createError.message.includes('already exists') ||
          createError.message.includes('unique constraint')) {
        errorMessage = 'A user with this email already exists';
        errorDetails = 'Email address is already registered in the system';
      } else if (createError.message.includes('invalid email')) {
        errorMessage = 'Invalid email format';
        errorDetails = 'Please provide a valid email address';
      } else if (createError.message.includes('password')) {
        errorMessage = 'Invalid password';
        errorDetails = 'Password does not meet security requirements';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      console.log(`[${requestId}] ERROR: No user data returned from auth creation`)
      return new Response(
        JSON.stringify({ 
          error: 'No user data returned from authentication creation',
          requestId 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${requestId}] Creating user profile...`)
    
    // Prepare profile data with proper validation
    const profileData = {
      id: authData.user.id,
      email: email.toLowerCase(),
      full_name: userData.full_name.trim(),
      phone: userData.phone?.trim() || null,
      department: userData.department?.trim() || null,
      role: userData.role,
      manager_id: userData.manager_id || null,
      date_naissance: userData.date_naissance || null,
      fiche_poste: userData.fiche_poste?.trim() || null,
      is_active: userData.is_active !== undefined ? userData.is_active : true
    }

    console.log(`[${requestId}] Profile data prepared: ${JSON.stringify({
      ...profileData,
      id: '[USER_ID]'
    })}`)

    // Create the user profile with retry logic
    let profileCreateError;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .insert([profileData])

      if (!error) {
        profileCreateError = null;
        break;
      }

      profileCreateError = error;
      retryCount++;
      console.log(`[${requestId}] Profile creation attempt ${retryCount} failed: ${error.message}`)
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (profileCreateError) {
      console.log(`[${requestId}] ERROR: Profile creation failed after ${maxRetries} attempts, cleaning up auth user`)
      
      // Clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log(`[${requestId}] Auth user cleanup successful`)
      } catch (cleanupError) {
        console.error(`[${requestId}] Failed to cleanup auth user: ${cleanupError}`)
      }
      
      // Provide more specific error message for profile creation failures
      let errorMessage = 'Failed to create user profile';
      let errorDetails = profileCreateError.message;
      
      if (profileCreateError.message.includes('duplicate') || 
          profileCreateError.message.includes('unique constraint') ||
          profileCreateError.message.includes('already exists')) {
        errorMessage = 'A user with this email already exists';
        errorDetails = 'User profile with this email is already registered';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] === USER CREATED SUCCESSFULLY in ${duration}ms ===`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        message: 'User created successfully',
        requestId,
        duration
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] === UNEXPECTED ERROR after ${duration}ms ===`)
    console.log(`[${requestId}] Error: ${error.message}`)
    console.log(`[${requestId}] Stack: ${error.stack}`)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again or contact support.',
        requestId,
        ...(Deno.env.get('ENVIRONMENT') === 'development' && {
          details: error.message,
          stack: error.stack
        })
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})