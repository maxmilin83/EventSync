// Select DOM elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const authMessage = document.getElementById('auth-message');

// Toggle forms
switchToRegister.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  authMessage.textContent = ''; 
});

switchToLogin.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  authMessage.textContent = '';
});

// Register functionality
document.getElementById('register-btn').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    // Check if username already exists
    const usernameQuery = await db.collection('users')
    .where('username', '==', username)
    .get();
  
    if (!usernameQuery.empty) {
    authMessage.textContent = `Username already exists`;
    return;
    }

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    authMessage.classList.remove('auth-message');
    authMessage.classList.add('auth-message-success');
    
    authMessage.textContent = 'Registration successful! You can now log in.';
    
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');

    await db.collection('users').doc(user.uid).set({
        username: username,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

  } catch (error) {
    authMessage.textContent = `Error: ${error.message}`;
  }
});

// Login functionality
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    authMessage.classList.remove('auth-message');
    authMessage.classList.add('auth-message-success');
    authMessage.textContent = 'Login successful! Redirecting...';
    setTimeout(() => {
      window.location.href = '/index.html'; 
    }, 1000);
  } catch (error) {
    authMessage.textContent = `Error: ${error.message}`;
  }
});