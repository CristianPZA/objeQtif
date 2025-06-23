import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE USER FUNCTION START ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Create a Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create a regular client to verify the requesting user's permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('ERROR: No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is authenticated and has admin privileges
    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    console.log('Auth user:', user?.id, 'Error:', authError?.message)

    if (authError || !user) {
      console.log('ERROR: Invalid authentication', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication: ' + (authError?.message || 'No user') }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('User profile:', profile, 'Error:', profileError?.message)

    if (profileError || !profile || !['direction', 'admin'].includes(profile.role)) {
      console.log('ERROR: Insufficient permissions', profile?.role)
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Required: direction or admin. Current: ' + (profile?.role || 'none') }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const requestBody = await req.text()
    console.log('Request body length:', requestBody.length)
    
    let parsedBody
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.log('ERROR: Invalid JSON', parseError.message)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, password, userData } = parsedBody
    console.log('Parsed data - Email:', email, 'Password length:', password?.length, 'UserData keys:', Object.keys(userData || {}))

    if (!email || !password || !userData) {
      console.log('ERROR: Missing required fields')
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          received: {
            email: !!email,
            password: !!password,
            userData: !!userData
          }
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
      console.log('ERROR: Invalid email format')
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.some(u => u.email === email)
    
    if (userExists) {
      console.log('ERROR: User already exists')
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating user with admin client...')
    
    // Create the user using admin client
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        created_by: user.id
      }
    })

    console.log('User creation result:', authData?.user?.id, 'Error:', createError?.message)

    if (createError) {
      console.log('ERROR: Failed to create auth user', createError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to create user: ' + createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      console.log('ERROR: No user data returned')
      return new Response(
        JSON.stringify({ error: 'No user data returned from auth creation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating user profile...')
    
    // Create the user profile
    const profileData = {
      id: authData.user.id,
      email: email,
      full_name: userData.full_name,
      phone: userData.phone || null,
      department: userData.department || null,
      role: userData.role,
      manager_id: userData.manager_id || null,
      date_naissance: userData.date_naissance || null,
      fiche_poste: userData.fiche_poste || null,
      is_active: userData.is_active !== undefined ? userData.is_active : true
    }

    console.log('Profile data:', profileData)

    const { error: profileCreateError } = await supabaseAdmin
      .from('user_profiles')
      .insert([profileData])

    console.log('Profile creation error:', profileCreateError?.message)

    if (profileCreateError) {
      console.log('ERROR: Profile creation failed, cleaning up auth user')
      // If profile creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + profileCreateError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('=== USER CREATED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        message: 'User created successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.log('=== UNEXPECTED ERROR ===')
    console.log('Error:', error.message)
    console.log('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error: ' + error.message,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})