// Test Supabase connection
const SUPABASE_URL = "https://zbmpysqxauzfrbvroboh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibXB5c3F4YXV6ZnJidnJvYm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTkxNjUsImV4cCI6MjA3NDUzNTE2NX0.yAHPEM7b6XQORKLdn6rE5vnc84Wxwa0YmIE3r4cdkss";

console.log('Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);
console.log('API Key:', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...');

// Test with fetch directly
fetch(`${SUPABASE_URL}/rest/v1/challenge_phases?select=*&limit=1`, {
  headers: {
    'apikey': SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(data => {
  console.log('Response data:', data);
})
.catch(error => {
  console.error('Error:', error);
});
