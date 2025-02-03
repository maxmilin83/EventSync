const firebaseConfig = {
    apiKey: "AIzaSyA1vb5wEc3azyy3O2rcNh8iSCIla1QemJI",
    authDomain: "eventproject-1921f.firebaseapp.com",
    projectId: "eventproject-1921f",
    storageBucket: "eventproject-1921f.firebasestorage.app",
    messagingSenderId: "430569288899",
    appId: "1:430569288899:web:419449c16f923cc6fb5e76",
    measurementId: "G-K85F5LY473"
  };
  
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

const auth = firebase.auth();

  
// Persistence for authentication
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log("Authentication persistence set to localStorage.");
  })
  .catch((error) => {
    console.error("Error setting authentication persistence:", error.message);
  });


// Logout Function
const handleLogout = async () => {
  try {
    await auth.signOut();

    window.location.href = "../pages/login.html";
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert("Error logging out: " + error.message);
  }
};

// Logout functionality
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});
