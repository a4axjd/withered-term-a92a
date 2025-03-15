export default {
  async fetch(request, env, ctx) {
    // Check if this is a preflight request (OPTIONS)
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    // Only allow POST requests for sending emails
    if (request.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders() 
      });
    }

    try {
      // Parse the JSON request body
      const requestData = await request.json();
      const { from, to, subject, html, text } = requestData;
      
      // Validate required fields
      if (!from || !to || !subject || !html) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing required fields (from, to, subject, html)" 
          }), 
          { 
            status: 400, 
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json"
            } 
          }
        );
      }

      // Prepare the request to Resend API
      const resendRequest = {
        from,
        to,
        subject,
        html,
        ...(text && { text }) // Only include text if it was provided
      };

      // Send the request to Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resendRequest)
      });

      // Parse the response from Resend
      const resendResponse = await response.json();
      
      // Forward the response back to the client
      return new Response(
        JSON.stringify({ 
          success: response.ok,
          data: response.ok ? resendResponse : null,
          error: !response.ok ? resendResponse.message || "Failed to send email" : null
        }), 
        { 
          status: response.ok ? 200 : 400,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
          } 
        }
      );
    } catch (error) {
      // Handle any errors
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || "Internal server error" 
        }), 
        { 
          status: 500,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
          } 
        }
      );
    }
  }
};

// Helper function to handle CORS preflight requests
function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

// Helper function to set CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // In production, you might want to restrict this to your domain
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400" // 24 hours
  };
}

