const servellesDb = window.supabase.createClient(
  window.SERVELLES_SUPABASE_URL,
  window.SERVELLES_SUPABASE_PUBLISHABLE_KEY
);

let SERVELLES_USER = null;
let SERVELLES_HOTEL = null;
let SERVELLES_MEMBERSHIP = null;

const authScreen = document.getElementById('authScreen');
const appShell = document.querySelector('.app-shell');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

function setLoginMessage(message, isError = false) {
  if (!loginMessage) return;
  loginMessage.textContent = message || '';
  loginMessage.classList.toggle('auth-error', isError);
}

function initials(name) {
  return (name || 'S').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
}

async function loadServellesContext(user) {
  const { data: profile } = await servellesDb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const { data: membership, error: membershipError } = await servellesDb
    .from('hotel_memberships')
    .select('id,hotel_id,role,active,hotels(id,name,short_name,slug,active)')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership || !membership.hotels) throw new Error('Your account is not assigned to a hotel yet.');

  SERVELLES_USER = { ...user, full_name: profile?.full_name || user.user_metadata?.full_name || user.email };
  SERVELLES_MEMBERSHIP = membership;
  SERVELLES_HOTEL = membership.hotels;

  const hotelName = document.querySelector('.hotel-name');
  const hotelSub = document.querySelector('.hotel-sub');
  const hotelLogo = document.querySelector('.hotel-logo');
  const eyebrow = document.querySelector('.topbar .eyebrow');
  const profileBubble = document.querySelector('.profile');

  if (hotelName) hotelName.textContent = SERVELLES_HOTEL.name.toUpperCase();
  if (hotelSub) hotelSub.textContent = membership.role.replaceAll('_',' ').toUpperCase();
  if (hotelLogo) hotelLogo.textContent = initials(SERVELLES_HOTEL.short_name || SERVELLES_HOTEL.name).slice(0,1);
  if (eyebrow) eyebrow.textContent = `Welcome, ${SERVELLES_USER.full_name}`;
  if (profileBubble) profileBubble.textContent = initials(SERVELLES_USER.full_name);

  authScreen?.classList.add('hidden');
  appShell?.classList.remove('auth-locked');
}

async function showSignedOut() {
  SERVELLES_USER = SERVELLES_HOTEL = SERVELLES_MEMBERSHIP = null;
  appShell?.classList.add('auth-locked');
  authScreen?.classList.remove('hidden');
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const button = document.getElementById('loginButton');
  button.disabled = true;
  setLoginMessage('Signing in…');
  const { data, error } = await servellesDb.auth.signInWithPassword({ email, password });
  button.disabled = false;
  if (error) return setLoginMessage(error.message, true);
  try {
    await loadServellesContext(data.user);
    setLoginMessage('');
  } catch (err) {
    await servellesDb.auth.signOut();
    setLoginMessage(err.message, true);
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await servellesDb.auth.signOut();
});

servellesDb.auth.onAuthStateChange(async (event, session) => {
  if (!session?.user) return showSignedOut();
  try { await loadServellesContext(session.user); }
  catch (err) { setLoginMessage(err.message, true); await showSignedOut(); }
});

(async function bootAuth(){
  const { data } = await servellesDb.auth.getSession();
  if (data.session?.user) {
    try { await loadServellesContext(data.session.user); }
    catch (err) { setLoginMessage(err.message, true); await showSignedOut(); }
  } else await showSignedOut();
})();
