import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function sendNotification(supabaseUrl: string, functionName: string, payload: object, anonKey: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Error calling ${functionName}:`, error);
    } else {
      console.log(`✅ Successfully called ${functionName}`);
    }
  } catch (err) {
    console.error(`Error invoking ${functionName}:`, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !webhookSecret) {
    console.error("Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("No Stripe signature found");
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Received Stripe event: ${event.type}`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        console.log(`Checkout completed for email: ${customerEmail}, customer: ${customerId}, subscription: ${subscriptionId}`);

        if (!customerEmail) {
          console.error("No customer email found in checkout session");
          break;
        }

        // Find user by email in auth.users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error listing users:", authError);
          break;
        }

        const user = authUsers.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());

        if (!user) {
          console.log(`No user found with email: ${customerEmail}`);
          break;
        }

        console.log(`Found user: ${user.id}`);

        // Calculate trial end date (3 days from now)
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Update user metadata to remove pending flag
        const { error: updateUserError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { 
            ...user.user_metadata,
            stripe_checkout_pending: false 
          }
        });

        if (updateUserError) {
          console.error("Error updating user metadata:", updateUserError);
        }

        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id, name, phone, whatsapp_opt_in")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const { error: updateError } = await supabase
            .from("user_profiles")
            .update({
              stripe_checkout_pending: false,
              plan_type: "premium",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_started_at: now.toISOString(),
              plan_expires_at: trialEnd.toISOString(),
            })
            .eq("user_id", user.id);

          if (updateError) {
            console.error("Error updating user profile:", updateError);
          } else {
            console.log(`Successfully updated user profile for ${user.id}`);
            
            // Send Day 0 notification
            await sendNotification(supabaseUrl, 'trial-started-notification', {
              user_id: user.id,
              email: customerEmail,
              name: existingProfile.name || user.user_metadata?.name || 'Usuário',
              phone: existingProfile.phone,
              whatsapp_opt_in: existingProfile.whatsapp_opt_in,
            }, supabaseAnonKey);
          }
        } else {
          console.log(`User profile does not exist yet for ${user.id}, will be created during onboarding`);
          
          // Still send Day 0 notification with minimal data
          await sendNotification(supabaseUrl, 'trial-started-notification', {
            user_id: user.id,
            email: customerEmail,
            name: user.user_metadata?.name || 'Usuário',
            phone: null,
            whatsapp_opt_in: false,
          }, supabaseAnonKey);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        console.log(`Invoice payment succeeded for customer: ${customerId}`);

        // Skip if this is the first invoice (trial period)
        // billing_reason will be 'subscription_create' for trial start
        if (invoice.billing_reason === 'subscription_create') {
          console.log('First invoice (trial start), skipping activation notification');
          break;
        }

        // Find user by stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("user_id, name, phone, whatsapp_opt_in")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileError || !profile) {
          console.error("User not found for customer:", customerId);
          break;
        }

        // Get user email
        const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);
        const userEmail = authData?.user?.email;

        if (!userEmail) {
          console.error("No email found for user:", profile.user_id);
          break;
        }

        // Send Day 3 activation notification
        await sendNotification(supabaseUrl, 'trial-activated-notification', {
          user_id: profile.user_id,
          email: userEmail,
          name: profile.name || 'Usuário',
          phone: profile.phone,
          whatsapp_opt_in: profile.whatsapp_opt_in,
        }, supabaseAnonKey);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`Subscription updated for customer: ${customerId}`);

        // Find user by stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileError || !profile) {
          console.error("User not found for customer:", customerId);
          break;
        }

        const isActive = subscription.status === "active" || subscription.status === "trialing";
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            plan_type: isActive ? "premium" : "free",
            plan_expires_at: currentPeriodEnd.toISOString(),
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
        } else {
          console.log(`Updated subscription status for user ${profile.user_id}`);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`Subscription deleted for customer: ${customerId}`);

        // Find user by stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileError || !profile) {
          console.error("User not found for customer:", customerId);
          break;
        }

        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            plan_type: "free",
            stripe_subscription_id: null,
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          console.error("Error downgrading user:", updateError);
        } else {
          console.log(`Downgraded user ${profile.user_id} to free`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
